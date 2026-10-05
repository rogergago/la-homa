(function () {
  'use strict';
  const app = document.querySelector('#app');
  const dialog = document.querySelector('#dialog');
  const cfg = window.HOMA_PUBLIC || {};
  let client = null;
  let session = null;
  let editing = null;
  let flash = { text: '', bad: false };
  let pending = null;
  let mfa = null;
  let idleTimer = null;
  const IDLE_MS = 30 * 60 * 1000;
  const data = { dashboard: null, households: null, accounts: null, posts: null, log: null, detail: null, account: null };
  const ui = { familyQuery: '', familyStatus: 'todas', familySort: 'recientes', accountQuery: '', accountFilter: 'todas' };

  const STATUS = {
    activa: ['Activa', 'ok'],
    poco_uso: ['Poco uso', 'warn'],
    dormida: ['Dormida', 'bad'],
    sin_uso: ['Sin uso', 'off']
  };
  const USAGE = {
    tasks: 'Tareas', weeks: 'Semanas', templates: 'Plantillas de tareas', swaps: 'Cambios entre hermanos',
    rewards: 'Recompensas', vouchers: 'Vales', events: 'Planes del calendario', preparations: 'Listas de preparación',
    recipes: 'Recetas', mealPlan: 'Días de menú', shopping: 'Productos en listas', pantry: 'Despensa', routines: 'Rutinas'
  };
  const ACTIONS = {
    update: 'Editó', delete: 'Eliminó', revoke_access: 'Quitó el acceso a', restore_access: 'Devolvió el acceso a',
    revoke_invitation: 'Anuló una invitación de', revoke_device: 'Desconectó un dispositivo de'
  };
  const FIELDS = { name: 'nombre de la casa', timezone: 'zona horaria', contact: 'contacto' };
  const ZONES = ['Europe/Madrid', 'Atlantic/Canary', 'Europe/Lisbon', 'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Rome',
    'America/Mexico_City', 'America/Bogota', 'America/Lima', 'America/Santiago', 'America/Argentina/Buenos_Aires', 'America/New_York', 'UTC'];
  const ERRORS = {
    FORBIDDEN: 'Esta cuenta no tiene permiso de operadora.',
    NOT_FOUND: 'Ya no existe. Puede que otra persona la haya borrado.',
    CONFIRM_MISMATCH: 'El texto de confirmación no coincide.',
    INVALID_EMAIL: 'El correo de contacto no parece válido.',
    INVALID_NAME: 'El nombre de la casa tiene que tener entre 1 y 120 caracteres.',
    INVALID_TIMEZONE: 'Esa zona horaria no existe.',
    CANNOT_DELETE_SELF: 'No puedes borrar tu propia cuenta desde el panel.',
    CANNOT_DELETE_OPERATOR: 'Las cuentas operadoras no se borran desde el panel.',
    MFA_REQUIRED: 'Hace falta el código de verificación.'
  };

  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  function tokenAal(sess) {
    try {
      const part = String(sess?.access_token || '').split('.')[1];
      if (!part) return '';
      const json = JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/')));
      return String(json.aal || '');
    } catch {
      return '';
    }
  }
  const hasAal2 = sess => tokenAal(sess) === 'aal2';
  function errorText(error) {
    return [error?.message, error?.details, error?.hint, error?.code, error].filter(Boolean).join(' ');
  }
  const norm = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const slugify = value => norm(value).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
  const valid = value => value && !Number.isNaN(new Date(value).getTime());
  const day = value => valid(value) ? new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium' }).format(new Date(value)) : '—';
  const when = value => valid(value) ? new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—';
  const short = value => valid(value) ? new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' }).format(new Date(value)) : '';
  const plural = (n, one, many) => `${Number(n || 0)} ${Number(n) === 1 ? one : many}`;
  const percent = (part, total) => total ? Math.round((Number(part || 0) / Number(total)) * 100) : 0;
  const provider = value => value === 'google' ? 'Google' : 'Correo';
  const fullName = contact => [contact?.firstName, contact?.lastName].filter(Boolean).join(' ');
  const phoneDigits = value => String(value || '').replace(/[^\d+]/g, '');

  function ago(value) {
    if (!valid(value)) return 'Nunca';
    const seconds = (Date.now() - new Date(value).getTime()) / 1000;
    if (seconds < 90) return 'Ahora mismo';
    if (seconds < 3600) return `Hace ${Math.round(seconds / 60)} min`;
    if (seconds < 86400) return `Hace ${Math.round(seconds / 3600)} h`;
    const days = Math.round(seconds / 86400);
    if (days === 1) return 'Ayer';
    if (days < 45) return `Hace ${days} días`;
    return day(value);
  }

  function badge(status) {
    const [label, tone] = STATUS[status] || ['—', 'off'];
    return `<span class="badge ${tone}">${label}</span>`;
  }

  function members(row) {
    if (!Number(row.records)) return '<span class="muted">Sin datos todavía</span>';
    const parts = [];
    if (row.adults) parts.push(plural(row.adults, 'adulto', 'adultos'));
    if (row.children) parts.push(plural(row.children, 'niño', 'niños'));
    if (row.pets) parts.push(plural(row.pets, 'mascota', 'mascotas'));
    return parts.join(' · ') || '<span class="muted">Sin miembros</span>';
  }

  function explain(error) {
    const text = errorText(error);
    const code = Object.keys(ERRORS).find(key => text.includes(key));
    return code ? ERRORS[code] : (error?.message || text || 'Algo ha fallado. Vuelve a intentarlo.');
  }

  async function requireMfa(notice) {
    try {
      await prepareMfa();
      mfaGate(notice || '');
    } catch (err) {
      gate('Activa la verificación en dos pasos', `
        <p class="lede">${esc(err.message || 'No se pudo preparar el segundo factor.')}</p>
        <p class="help">En Supabase: Authentication → Multi-Factor → Enable TOTP. Luego vuelve a entrar.</p>
        <div class="actions"><button class="quiet" type="button" data-action="logout">Salir</button></div>`);
    }
  }

  async function rpc(name, args) {
    const result = await client.rpc(name, args);
    if (result.error) {
      if (errorText(result.error).includes('MFA_REQUIRED')) {
        await requireMfa('Escribe el código de tu app de verificación para continuar.');
        throw new Error(ERRORS.MFA_REQUIRED);
      }
      throw new Error(explain(result.error));
    }
    return result.data;
  }

  function route() {
    const [, section = 'resumen', id = ''] = (location.hash || '#/resumen').split('/');
    return { section: section || 'resumen', id: decodeURIComponent(id) };
  }

  function say(text, bad) {
    flash = { text, bad: Boolean(bad) };
  }

  function invalidate() {
    data.dashboard = null;
    data.households = null;
    data.accounts = null;
    data.log = null;
  }

  const MARK = '<span class="mark"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 11.5 12 5l7 6.5V19H5z"/><path d="M10 19v-4.5h4V19"/></svg></span>';

  // Pantallas de acceso

  function gate(title, body) {
    app.className = 'gate';
    app.innerHTML = `<div class="card gate-card"><div class="brand">${MARK}<span>La Homa<small>Panel</small></span></div><h1>${title}</h1>${body}</div>`;
  }

  function login(notice, bad) {
    gate('Entra para administrar', `
      <p class="lede">Entra con el correo y la contraseña de tu cuenta. Solo esa cuenta, marcada como operadora, abre el panel.</p>
      ${notice ? `<div class="note ${bad ? 'bad' : ''}">${esc(notice)}</div>` : ''}
      <form data-form="login">
        <label class="field">Correo<input name="email" type="email" autocomplete="username" required maxlength="254"></label>
        <label class="field">Contraseña<input name="password" type="password" autocomplete="current-password" required minlength="10" maxlength="200"></label>
        <div class="actions"><button class="button wide" type="submit">Entrar</button></div>
      </form>`);
  }

  function denied() {
    gate('Esta cuenta no abre el panel', `
      <p class="lede">Has entrado como ${esc(session?.user?.email || 'esta cuenta')}, que no tiene acceso de operadora.</p>
      <div class="actions"><button class="quiet" type="button" data-action="logout">Salir</button></div>`);
  }

  function mfaGate(notice, bad) {
    const enrolling = Boolean(mfa?.qr);
    gate(enrolling ? 'Activa la verificación en dos pasos' : 'Código de verificación', `
      ${enrolling
        ? `<p class="lede">El panel puede borrar familias, así que pide algo más que la contraseña. Escanea este código con Google Authenticator, 1Password, Authy o la app de códigos que uses.</p>
          <p class="qr"><img src="${esc(mfa.qr)}" alt="Código QR para la app de verificación" width="180" height="180"></p>
          <p class="help">Si no puedes escanearlo, escribe esta clave en la app: <code class="secret">${esc(mfa.secret)}</code></p>`
        : '<p class="lede">Abre tu app de verificación y escribe el código de seis cifras de La Homa.</p>'}
      ${notice ? `<div class="note ${bad ? 'bad' : ''}">${esc(notice)}</div>` : ''}
      <form data-form="mfa">
        <label class="field">Código<input name="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" minlength="6" maxlength="6" required></label>
        <div class="actions"><button class="button wide" type="submit">${enrolling ? 'Activar y entrar' : 'Entrar'}</button></div>
      </form>
      <div class="actions"><button class="quiet" type="button" data-action="logout">Salir</button></div>`);
    app.querySelector('[name="code"]')?.focus();
  }

  async function prepareMfa() {
    const factors = await client.auth.mfa.listFactors();
    if (factors.error) throw new Error('No se pudo leer la verificación en dos pasos.');
    const verified = (factors.data.totp || []).find(f => f.status === 'verified');
    if (verified) { mfa = { factorId: verified.id }; return; }
    for (const f of factors.data.all || []) {
      if (f.factor_type === 'totp' && f.status !== 'verified') await client.auth.mfa.unenroll({ factorId: f.id });
    }
    const enrolled = await client.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Panel La Homa', issuer: 'La Homa' });
    if (enrolled.error) throw new Error('No se pudo preparar la verificación en dos pasos.');
    mfa = { factorId: enrolled.data.id, qr: enrolled.data.totp.qr_code, secret: enrolled.data.totp.secret };
  }

  function touch() {
    if (!session) return;
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => { logout('Sesión cerrada tras 30 minutos sin actividad.'); }, IDLE_MS);
  }

  // Estructura

  const NAV = [
    ['resumen', 'Resumen', '<path d="M4 13h6V4H4zM14 20h6V4h-6zM4 20h6v-3H4z"/>'],
    ['familias', 'Familias', '<path d="M4 11 12 4l8 7v9H4z"/><path d="M10 20v-5h4v5"/>'],
    ['cuentas', 'Cuentas', '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>'],
    ['articulos', 'Artículos', '<path d="M6 3h9l4 4v14H6z"/><path d="M9 12h7M9 16h7M9 8h3"/>'],
    ['registro', 'Registro', '<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>']
  ];

  function layout(title, subtitle, content, tools) {
    const current = route().section;
    const active = current === 'familia' ? 'familias' : current === 'cuenta' ? 'cuentas' : current;
    app.className = 'shell';
    app.innerHTML = `
      <aside class="side">
        <a class="brand" href="#/resumen">${MARK}<span>La Homa<small>Panel</small></span></a>
        <nav class="nav" aria-label="Secciones del panel">
          ${NAV.map(([key, label, icon]) => `<a href="#/${key}" ${active === key ? 'aria-current="page"' : ''}><svg viewBox="0 0 24 24" aria-hidden="true">${icon}</svg><span>${label}</span></a>`).join('')}
        </nav>
        <div class="side-foot">
          <span class="who" title="${esc(session.user.email || '')}">${esc(session.user.email || '')}</span>
          <button class="link" type="button" data-action="password">Cambiar contraseña</button>
          <button class="link" type="button" data-action="logout">Salir</button>
        </div>
      </aside>
      <main class="main" id="main">
        <header class="bar">
          <div><h1>${title}</h1>${subtitle ? `<p class="help">${subtitle}</p>` : ''}</div>
          <div class="bar-tools">${tools || ''}<button class="quiet" type="button" data-action="reload" title="Volver a leer los datos">Actualizar</button></div>
        </header>
        ${flash.text ? `<div class="note ${flash.bad ? 'bad' : 'good'}" role="status">${esc(flash.text)}</div>` : ''}
        ${content}
      </main>`;
    flash = { text: '', bad: false };
  }

  function loading(title) {
    layout(title, '', '<div class="card empty"><p class="help">Cargando…</p></div>');
  }

  // Resumen

  function weeklyChart(weeks) {
    const rows = weeks || [];
    const max = Math.max(1, ...rows.map(w => Math.max(Number(w.accounts || 0), Number(w.households || 0))));
    const width = 900, height = 190, top = 16, bottom = 26, slot = width / Math.max(rows.length, 1), bar = Math.min(18, slot / 3);
    const y = value => height - bottom - ((height - top - bottom) * value) / max;
    const bars = rows.map((w, i) => {
      const x = i * slot + slot / 2;
      const a = Number(w.accounts || 0), h = Number(w.households || 0);
      return `<g><title>Semana del ${short(w.week)}: ${plural(a, 'cuenta', 'cuentas')} y ${plural(h, 'casa', 'casas')}</title>
        <rect class="c-a" x="${(x - bar - 1).toFixed(1)}" y="${y(a).toFixed(1)}" width="${bar.toFixed(1)}" height="${(height - bottom - y(a)).toFixed(1)}" rx="4"/>
        <rect class="c-b" x="${(x + 1).toFixed(1)}" y="${y(h).toFixed(1)}" width="${bar.toFixed(1)}" height="${(height - bottom - y(h)).toFixed(1)}" rx="4"/>
        ${i % 2 === rows.length % 2 ? '' : `<text x="${x.toFixed(1)}" y="${height - 8}" text-anchor="middle">${esc(short(w.week))}</text>`}</g>`;
    }).join('');
    const grid = [0, 0.5, 1].map(f => {
      const value = Math.round(max * f);
      return `<line x1="0" x2="${width}" y1="${y(value).toFixed(1)}" y2="${y(value).toFixed(1)}"/><text class="axis" x="0" y="${(y(value) - 4).toFixed(1)}">${value}</text>`;
    }).join('');
    return `<svg class="chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Altas de cuentas y casas en las últimas 12 semanas"><g class="grid">${grid}</g>${bars}</svg>
      <div class="legend"><span><i class="c-a"></i>Cuentas nuevas</span><span><i class="c-b"></i>Casas nuevas</span></div>`;
  }

  function meter(value, total) {
    const width = Math.max(0, Math.min(100, percent(value, total)));
    return `<svg class="meter" viewBox="0 0 100 8" preserveAspectRatio="none" aria-hidden="true"><rect class="m-bg" width="100" height="8" rx="4"/><rect class="m-fg" width="${width}" height="8" rx="4"/></svg>`;
  }

  function kpi(label, value, note, tone) {
    return `<div class="kpi ${tone || ''}"><span>${label}</span><b>${Number(value || 0)}</b>${note ? `<small>${note}</small>` : ''}</div>`;
  }

  function familyLine(row) {
    const name = fullName(row.contact);
    return `<a class="line" href="#/familia/${esc(row.id)}"><span class="avatar">${esc((row.name || '?').slice(0, 1).toUpperCase())}</span>
      <span class="grow"><b>${esc(row.name)}</b><small>${esc(name || row.contact?.email || 'Sin titular')}</small></span>
      <span class="line-end">${badge(row.status)}<small>${esc(ago(row.lastActivity))}</small></span></a>`;
  }

  function logLine(entry) {
    const action = ACTIONS[entry.action] || entry.action;
    const fields = (entry.detail?.fields || []).map(f => FIELDS[f] || f).join(', ');
    const target = entry.targetType === 'account' ? `la cuenta ${entry.targetLabel}` : (entry.targetLabel || 'una casa');
    const extra = entry.detail?.account ? ` (${entry.detail.account})` : fields ? ` · ${fields}` : '';
    return `<li><span class="dot"></span><div><b>${esc(action)} ${esc(target)}</b><small>${esc(extra.replace(/^ · /, ''))}${extra ? ' · ' : ''}${esc(entry.operatorEmail || '')} · ${esc(when(entry.createdAt))}</small></div></li>`;
  }

  function resumenView() {
    const d = data.dashboard;
    const t = d.totals || {};
    const f = d.funnel || {};
    const a = d.adoption || {};
    const households = Number(t.households || 0);
    const funnel = [
      ['Cuentas creadas', f.accounts, f.accounts],
      ['Con una casa', f.withHome, f.accounts],
      ['Casas con datos', f.withData, households],
      ['Con datos y activas esta semana', f.active7, households]
    ];
    const adoption = [
      ['Tareas y puntos', a.tasks], ['Calendario', a.calendar], ['Menú y compra', a.kitchen], ['Paga y hucha', a.allowance],
      ['Rutinas', a.routines], ['Dos adultos', a.secondAdult], ['Convivencia', a.custody]
    ];
    const content = `
      <section class="kpis">
        ${kpi('Familias', t.households, `${plural(t.households30, 'nueva', 'nuevas')} en 30 días`)}
        ${kpi('Activas esta semana', t.active7, `${percent(t.active7, households)} % del total`, 'ok')}
        ${kpi('Cuentas', t.accounts, `${plural(t.google, 'entra', 'entran')} con Google`)}
        ${kpi('Altas en 7 días', t.signups7, `${plural(t.signups30, 'alta', 'altas')} en 30 días`)}
        ${kpi('Cuentas sin casa', t.withoutHome, 'Se registraron y no crearon casa', Number(t.withoutHome) ? 'warn' : '')}
        ${kpi('Sin confirmar correo', t.unconfirmed, 'No han pulsado el enlace', Number(t.unconfirmed) ? 'warn' : '')}
        ${kpi('Sin actividad', t.dormant, 'Más de 30 días o nunca', Number(t.dormant) ? 'bad' : '')}
        ${kpi('Invitaciones abiertas', t.pendingInvitations, 'Segundos adultos por entrar')}
      </section>
      <section class="grid-2">
        <div class="card span-2"><div class="card-head"><h2>Altas por semana</h2><span class="help">Últimas 12 semanas</span></div>${weeklyChart(d.weekly)}</div>
        <div class="card"><div class="card-head"><h2>Del registro al uso</h2></div>
          <ul class="bars">${funnel.map(([label, value, total]) => `<li><div class="bar-row"><span>${label}</span><b>${Number(value || 0)}</b></div>${meter(value, total)}</li>`).join('')}</ul>
          <p class="help">Las cuentas operadoras no cuentan. «Con datos» es una casa que ya ha guardado algo en la nube.</p></div>
        <div class="card"><div class="card-head"><h2>Qué usan las familias</h2><span class="help">de ${plural(households, 'casa', 'casas')}</span></div>
          <ul class="bars">${adoption.map(([label, value]) => `<li><div class="bar-row"><span>${label}</span><b>${Number(value || 0)}</b></div>${meter(value, households)}</li>`).join('')}</ul></div>
        <div class="card"><div class="card-head"><h2>Para contactar</h2><span class="help">Cuentas sin casa</span></div>
          ${(d.leads || []).length ? `<div class="lines">${d.leads.map(lead => `<div class="line"><span class="avatar soft">${esc((lead.name || lead.email || '?').slice(0, 1).toUpperCase())}</span>
            <span class="grow"><b>${esc(lead.name || 'Sin nombre')}</b><small>${esc(lead.email)} · ${esc(ago(lead.createdAt))}${lead.confirmed ? '' : ' · sin confirmar'}</small></span>
            <a class="quiet small" href="mailto:${esc(lead.email)}?subject=${encodeURIComponent('Tu casa en La Homa')}">Escribir</a></div>`).join('')}</div>`
            : '<p class="help">Todas las cuentas tienen casa. Nadie se ha quedado a medias.</p>'}</div>
        <div class="card"><div class="card-head"><h2>Sin actividad</h2><a class="help" href="#/familias">Ver familias</a></div>
          ${(d.dormant || []).length ? `<div class="lines">${d.dormant.map(familyLine).join('')}</div>` : '<p class="help">Todas las familias se han usado en los últimos 30 días.</p>'}</div>
        <div class="card"><div class="card-head"><h2>Últimas familias</h2></div>
          ${(d.recent || []).length ? `<div class="lines">${d.recent.map(familyLine).join('')}</div>` : '<p class="help">Todavía no hay casas.</p>'}</div>
        <div class="card"><div class="card-head"><h2>Últimos cambios</h2><a class="help" href="#/registro">Ver registro</a></div>
          ${(d.log || []).length ? `<ul class="timeline">${d.log.map(logLine).join('')}</ul>` : '<p class="help">Aquí aparecerá lo que se cambie o borre desde el panel.</p>'}</div>
      </section>`;
    layout('Resumen', `${plural(households, 'familia', 'familias')} y ${plural(t.accounts, 'cuenta', 'cuentas')}. Artículos: ${Number(t.postsPublished || 0)} publicados, ${Number(t.postsDraft || 0)} en borrador.`, content);
  }

  // Familias

  function filteredFamilies() {
    const query = norm(ui.familyQuery).trim();
    const rows = (data.households || []).filter(row => {
      if (ui.familyStatus === 'nuevas' && !row.isNew) return false;
      if (STATUS[ui.familyStatus] && row.status !== ui.familyStatus) return false;
      if (!query) return true;
      const c = row.contact || {};
      return norm([row.name, c.firstName, c.lastName, c.email, c.phone, (c.tags || []).join(' '), row.holder?.accountEmail].join(' ')).includes(query);
    });
    const time = value => valid(value) ? new Date(value).getTime() : 0;
    const sorters = {
      recientes: (a, b) => time(b.createdAt) - time(a.createdAt),
      actividad: (a, b) => time(b.lastActivity) - time(a.lastActivity),
      inactivas: (a, b) => time(a.lastActivity) - time(b.lastActivity),
      nombre: (a, b) => a.name.localeCompare(b.name, 'es')
    };
    return rows.sort(sorters[ui.familySort] || sorters.recientes);
  }

  function familyRows() {
    const rows = filteredFamilies();
    if (!rows.length) return `<tr><td colspan="7" class="empty-row">${(data.households || []).length ? 'Ninguna familia coincide con la búsqueda.' : 'Todavía no hay familias.'}</td></tr>`;
    return rows.map(row => {
      const c = row.contact || {};
      return `<tr class="clickable" data-action="open-family" data-id="${esc(row.id)}">
        <td><a href="#/familia/${esc(row.id)}" class="strong">${esc(row.name)}</a>${row.isNew ? ' <span class="badge new">Nueva</span>' : ''}${(c.tags || []).map(tag => ` <span class="tag">${esc(tag)}</span>`).join('')}</td>
        <td><b>${esc(fullName(c) || '—')}</b><small>${esc(c.email || '')}</small></td>
        <td>${esc(c.phone || '—')}</td>
        <td>${members(row)}<small>${plural(row.accounts, 'cuenta', 'cuentas')}</small></td>
        <td>${esc(day(row.createdAt))}</td>
        <td>${esc(ago(row.lastActivity))}</td>
        <td>${badge(row.status)}</td></tr>`;
    }).join('');
  }

  function familiasView() {
    const all = data.households || [];
    const count = key => all.filter(row => key === 'nuevas' ? row.isNew : row.status === key).length;
    const option = (value, label) => `<option value="${value}" ${ui.familyStatus === value ? 'selected' : ''}>${label}</option>`;
    const sort = (value, label) => `<option value="${value}" ${ui.familySort === value ? 'selected' : ''}>${label}</option>`;
    const content = `
      <section class="chips">
        <span class="chip"><b>${all.length}</b> en total</span>
        <span class="chip ok"><b>${count('activa')}</b> activas</span>
        <span class="chip warn"><b>${count('poco_uso')}</b> con poco uso</span>
        <span class="chip bad"><b>${count('dormida') + count('sin_uso')}</b> sin actividad</span>
        <span class="chip"><b>${count('nuevas')}</b> nuevas esta semana</span>
      </section>
      <section class="card flush">
        <div class="toolbar">
          <label class="search"><span class="sr">Buscar</span><input type="search" data-filter="familyQuery" value="${esc(ui.familyQuery)}" placeholder="Buscar por casa, nombre, correo, teléfono o etiqueta"></label>
          <label class="select"><span class="sr">Estado</span><select data-filter="familyStatus">${option('todas', 'Todos los estados')}${option('activa', 'Activas')}${option('poco_uso', 'Poco uso')}${option('dormida', 'Dormidas')}${option('sin_uso', 'Sin uso')}${option('nuevas', 'Nuevas')}</select></label>
          <label class="select"><span class="sr">Orden</span><select data-filter="familySort">${sort('recientes', 'Más recientes')}${sort('actividad', 'Última actividad')}${sort('inactivas', 'Más tiempo sin usar')}${sort('nombre', 'Por nombre')}</select></label>
        </div>
        <div class="table-wrap"><table>
          <thead><tr><th>Familia</th><th>Titular</th><th>Teléfono</th><th>Miembros</th><th>Alta</th><th>Actividad</th><th>Estado</th></tr></thead>
          <tbody id="rows">${familyRows()}</tbody>
        </table></div>
      </section>`;
    layout('Familias', 'Cada casa con la persona que la creó y sus datos de contacto. Pulsa una fila para ver la ficha.', content,
      '<button class="quiet" type="button" data-action="export-families">Exportar CSV</button>');
  }

  // Ficha de familia

  function field(label, name, value, attrs) {
    return `<label class="field">${label}<input name="${name}" value="${esc(value || '')}" ${attrs || ''}></label>`;
  }

  function familiaView() {
    const h = data.detail;
    const c = h.contact || {};
    const raw = phoneDigits(c.phone).replace(/^\+/, '').replace(/^00/, '');
    const digits = /^[6789]\d{8}$/.test(raw) ? `34${raw}` : raw;
    const zones = ZONES.includes(h.timezone) ? ZONES : [h.timezone, ...ZONES];
    const usage = Object.entries(h.usage || {}).sort((a, b) => b[1] - a[1]);
    const me = session.user.id;
    const accounts = h.accountList || [];
    const content = `
      <a class="back" href="#/familias">← Todas las familias</a>
      <section class="card hero-card">
        <div class="hero-main"><span class="avatar big">${esc((h.name || '?').slice(0, 1).toUpperCase())}</span>
          <div><h2>${esc(h.name)} ${badge(h.status)}${h.isNew ? ' <span class="badge new">Nueva</span>' : ''}</h2>
          <p class="help">Alta el ${esc(day(h.createdAt))} · Última actividad: ${esc(ago(h.lastActivity).toLowerCase())} · ${members(h)}</p></div></div>
        <div class="hero-actions">
          ${c.email ? `<a class="button" href="mailto:${esc(c.email)}">Escribir</a>` : ''}
          ${c.phone ? `<a class="quiet" href="tel:${esc(phoneDigits(c.phone))}">Llamar</a>` : ''}
          ${digits.length >= 8 ? `<a class="quiet" href="https://wa.me/${esc(digits)}" target="_blank" rel="noopener">WhatsApp</a>` : ''}
        </div>
      </section>
      <section class="grid-2">
        <form class="card" data-form="contact">
          <div class="card-head"><h2>Titular y contacto</h2>${c.edited ? `<span class="help">Editado ${esc(ago(c.updatedAt).toLowerCase())}</span>` : '<span class="help">Datos de su cuenta</span>'}</div>
          <div class="fields-2">
            ${field('Nombre', 'firstName', c.firstName, 'maxlength="80" autocomplete="off"')}
            ${field('Apellidos', 'lastName', c.lastName, 'maxlength="120" autocomplete="off"')}
            ${field('Correo de contacto', 'email', c.email, 'type="email" maxlength="254" autocomplete="off"')}
            ${field('Teléfono', 'phone', c.phone, 'type="tel" maxlength="40" autocomplete="off" placeholder="+34 600 000 000"')}
          </div>
          ${field('Etiquetas', 'tags', (c.tags || []).join(', '), 'maxlength="300" placeholder="Separadas por comas: beta, colegio, recomendada"')}
          <label class="field">Notas internas<textarea name="notes" maxlength="4000" placeholder="Lo que hayáis hablado, lo que pidió, cuándo volver a llamar…">${esc(c.notes || '')}</textarea></label>
          <p class="help">Al principio se rellena con la cuenta que creó la casa${h.holder ? ` (${esc(h.holder.accountEmail)}, ${provider(h.holder.provider)})` : ''}. Lo que cambies aquí solo queda en el panel: no cambia el correo con el que esa persona entra en la app.</p>
          <div class="actions"><button class="button" type="submit">Guardar contacto</button></div>
        </form>
        <div class="stack">
          <form class="card" data-form="house">
            <div class="card-head"><h2>Datos de la casa</h2></div>
            ${field('Nombre de la casa', 'name', h.name, 'required maxlength="120"')}
            <label class="field">Zona horaria<select name="timezone">${zones.map(zone => `<option value="${esc(zone)}" ${zone === h.timezone ? 'selected' : ''}>${esc(zone)}</option>`).join('')}</select></label>
            <p class="help">La zona horaria decide cuándo empieza y termina cada día de la casa.</p>
            <div class="actions"><button class="button" type="submit">Guardar casa</button></div>
          </form>
          <div class="card">
            <div class="card-head"><h2>Uso</h2><span class="help">Cuántas cosas hay, nunca qué dicen</span></div>
            <div class="mini-kpis">
              <div><b>${Number(h.adults || 0)}</b><span>Adultos</span></div>
              <div><b>${Number(h.children || 0)}</b><span>Niños</span></div>
              <div><b>${Number(h.pets || 0)}</b><span>Mascotas</span></div>
              <div><b>${Number(h.accounts || 0)}</b><span>Cuentas</span></div>
            </div>
            ${usage.length ? `<ul class="facts">${usage.map(([kind, n]) => `<li><span>${esc(USAGE[kind] || kind)}</span><b>${Number(n)}</b></li>`).join('')}</ul>` : '<p class="help">La casa todavía no ha guardado datos en la nube.</p>'}
            <ul class="facts">
              <li><span>Usa la paga y la hucha</span><b>${h.usesAllowance ? 'Sí' : 'No'}</b></li>
              <li><span>Usa el calendario de convivencia</span><b>${h.usesCustody ? 'Sí' : 'No'}</b></li>
              <li><span>Archivos guardados</span><b>${Number(h.files?.count || 0)}${h.files?.bytes ? ` · ${(Number(h.files.bytes) / 1048576).toFixed(1)} MB` : ''}</b></li>
              <li><span>Última sincronización</span><b>${esc(ago(h.lastSync))}</b></li>
              <li><span>Registros en la nube</span><b>${Number(h.records || 0)}</b></li>
            </ul>
          </div>
        </div>
      </section>
      <section class="card flush">
        <div class="card-head pad"><h2>Cuentas con acceso</h2><span class="help">Adultos que pueden abrir esta casa</span></div>
        <div class="table-wrap"><table>
          <thead><tr><th>Persona</th><th>Entra con</th><th>Papel</th><th>En la casa desde</th><th>Último acceso</th><th>Estado</th><th></th></tr></thead>
          <tbody>${accounts.length ? accounts.map(acc => `<tr>
            <td><b>${esc(acc.name || 'Sin nombre')}</b><small>${esc(acc.email)}</small></td>
            <td>${provider(acc.provider)}${acc.confirmed ? '' : '<small>Correo sin confirmar</small>'}</td>
            <td>${acc.role === 'owner' ? 'Titular' : 'Adulto'}${acc.isOperator ? ' <span class="badge new">Operadora</span>' : ''}</td>
            <td>${esc(day(acc.joinedAt))}</td>
            <td>${esc(ago(acc.lastSignIn))}</td>
            <td>${acc.revokedAt ? '<span class="badge bad">Sin acceso</span>' : '<span class="badge ok">Con acceso</span>'}</td>
            <td class="row-actions">${acc.revokedAt
              ? `<button class="quiet small" type="button" data-action="restore-access" data-user="${esc(acc.userId)}">Devolver acceso</button>`
              : acc.userId === me ? '' : `<button class="danger small" type="button" data-action="revoke-access" data-user="${esc(acc.userId)}" data-email="${esc(acc.email)}">Quitar acceso</button>`}${acc.isOperator || acc.userId === me ? '' : `<button class="danger small" type="button" data-action="delete-account" data-user="${esc(acc.userId)}" data-email="${esc(acc.email)}">Eliminar cuenta</button>`}</td>
          </tr>`).join('') : '<tr><td colspan="7" class="empty-row">Esta casa no tiene ninguna cuenta. Nadie puede abrirla.</td></tr>'}</tbody>
        </table></div>
      </section>
      ${(h.invitations || []).length ? `<section class="card flush">
        <div class="card-head pad"><h2>Invitaciones</h2></div>
        <div class="table-wrap"><table><thead><tr><th>Invitó</th><th>Caduca</th><th>Estado</th><th></th></tr></thead><tbody>
        ${h.invitations.map(inv => {
          const open = !inv.acceptedAt && !inv.revokedAt && new Date(inv.expiresAt) > new Date();
          const state = inv.acceptedAt ? '<span class="badge ok">Aceptada</span>' : inv.revokedAt ? '<span class="badge off">Anulada</span>' : open ? '<span class="badge warn">Pendiente</span>' : '<span class="badge off">Caducada</span>';
          return `<tr><td>${esc(inv.invitedBy || '—')}</td><td>${esc(day(inv.expiresAt))}</td><td>${state}</td><td class="row-actions">${open ? `<button class="danger small" type="button" data-action="revoke-invitation" data-id="${esc(inv.id)}">Anular</button>` : ''}</td></tr>`;
        }).join('')}</tbody></table></div></section>` : ''}
      ${(h.devices || []).length ? `<section class="card flush">
        <div class="card-head pad"><h2>Dispositivos</h2></div>
        <div class="table-wrap"><table><thead><tr><th>Nombre</th><th>Conectado</th><th>Caduca</th><th>Estado</th><th></th></tr></thead><tbody>
        ${h.devices.map(dev => `<tr><td>${esc(dev.name)}</td><td>${esc(day(dev.createdAt))}</td><td>${esc(day(dev.expiresAt))}</td><td>${dev.revokedAt ? '<span class="badge off">Desconectado</span>' : '<span class="badge ok">Activo</span>'}</td>
          <td class="row-actions">${dev.revokedAt ? '' : `<button class="danger small" type="button" data-action="revoke-device" data-id="${esc(dev.id)}">Desconectar</button>`}</td></tr>`).join('')}
        </tbody></table></div></section>` : ''}
      <section class="grid-2">
        <div class="card"><div class="card-head"><h2>Historial en el panel</h2></div>
          ${(h.log || []).length ? `<ul class="timeline">${h.log.map(entry => logLine({ ...entry, targetLabel: h.name, targetType: 'household' })).join('')}</ul>` : '<p class="help">Nadie ha cambiado nada de esta familia desde el panel.</p>'}</div>
        <div class="card danger-zone"><div class="card-head"><h2>Eliminar familia</h2></div>
          <p>Borra la casa y todo lo que contiene: miembros, tareas, paga, calendario, menús, archivos e invitaciones. No se puede deshacer.</p>
          <p class="help">Úsalo cuando la familia lo pida o para limpiar casas de prueba. Puedes borrar también las cuentas de sus adultos.</p>
          <div class="actions"><button class="danger solid" type="button" data-action="delete-family">Eliminar esta familia</button></div></div>
      </section>`;
    layout('Ficha de familia', '', content);
  }

  // Cuentas

  function filteredAccounts() {
    const query = norm(ui.accountQuery).trim();
    return (data.accounts || []).filter(acc => {
      const f = ui.accountFilter;
      if (f === 'con-casa' && !acc.householdId) return false;
      if (f === 'sin-casa' && (acc.householdId || acc.isOperator)) return false;
      if (f === 'sin-confirmar' && acc.confirmed) return false;
      if (f === 'google' && acc.provider !== 'google') return false;
      if (f === 'operadoras' && !acc.isOperator) return false;
      return !query || norm([acc.name, acc.email, acc.householdName].join(' ')).includes(query);
    });
  }

  function accountRows() {
    const rows = filteredAccounts();
    if (!rows.length) return '<tr><td colspan="6" class="empty-row">Ninguna cuenta coincide.</td></tr>';
    return rows.map(acc => `<tr class="clickable" data-action="open-account" data-user="${esc(acc.userId)}">
      <td><a href="#/cuenta/${esc(acc.userId)}" class="strong">${esc(acc.name || 'Sin nombre')}</a><small>${esc(acc.email)}</small></td>
      <td>${provider(acc.provider)}</td>
      <td>${acc.householdId ? `<a href="#/familia/${esc(acc.householdId)}">${esc(acc.householdName)}</a><small>${acc.role === 'owner' ? 'Titular' : 'Adulto'}</small>` : '<span class="muted">Sin casa</span>'}</td>
      <td>${esc(day(acc.createdAt))}</td>
      <td>${esc(ago(acc.lastSignIn))}</td>
      <td>${acc.isOperator ? '<span class="badge new">Operadora</span> ' : ''}${acc.confirmed ? '<span class="badge ok">Confirmada</span>' : '<span class="badge warn">Sin confirmar</span>'}</td>
    </tr>`).join('');
  }

  function cuentasView() {
    const option = (value, label) => `<option value="${value}" ${ui.accountFilter === value ? 'selected' : ''}>${label}</option>`;
    const content = `
      <section class="card flush">
        <div class="toolbar">
          <label class="search"><span class="sr">Buscar</span><input type="search" data-filter="accountQuery" value="${esc(ui.accountQuery)}" placeholder="Buscar por nombre, correo o casa"></label>
          <label class="select"><span class="sr">Filtro</span><select data-filter="accountFilter">${option('todas', 'Todas las cuentas')}${option('con-casa', 'Con casa')}${option('sin-casa', 'Sin casa')}${option('sin-confirmar', 'Sin confirmar')}${option('google', 'Entran con Google')}${option('operadoras', 'Operadoras')}</select></label>
        </div>
        <div class="table-wrap"><table>
          <thead><tr><th>Persona</th><th>Entra con</th><th>Casa</th><th>Alta</th><th>Último acceso</th><th>Estado</th></tr></thead>
          <tbody id="rows">${accountRows()}</tbody>
        </table></div>
      </section>`;
    layout('Cuentas', 'Todas las personas adultas registradas. Los niños no tienen cuenta y no aparecen aquí. Pulsa una fila para ver la ficha.', content,
      '<button class="quiet" type="button" data-action="export-accounts">Exportar CSV</button>');
  }

  function cuentaView() {
    const acc = data.account;
    const me = session.user.id;
    const canDelete = !acc.isOperator && acc.userId !== me;
    const content = `
      <a class="back" href="#/cuentas">← Todas las cuentas</a>
      <section class="card hero-card">
        <div class="hero-main"><span class="avatar big">${esc((acc.name || acc.email || '?').slice(0, 1).toUpperCase())}</span>
          <div><h2>${esc(acc.name || 'Sin nombre')}</h2>
          <p class="help">${esc(acc.email)} · Alta el ${esc(day(acc.createdAt))} · Último acceso: ${esc(ago(acc.lastSignIn).toLowerCase())}</p></div></div>
        <div class="hero-actions">
          <a class="button" href="mailto:${esc(acc.email)}">Escribir</a>
          ${acc.householdId ? `<a class="quiet" href="#/familia/${esc(acc.householdId)}">Ver familia</a>` : ''}
        </div>
      </section>
      <section class="grid-2">
        <div class="card">
          <div class="card-head"><h2>Datos de la cuenta</h2></div>
          <ul class="facts">
            <li><span>Correo</span><b>${esc(acc.email)}</b></li>
            <li><span>Entra con</span><b>${provider(acc.provider)}</b></li>
            <li><span>Correo confirmado</span><b>${acc.confirmed ? 'Sí' : 'No'}</b></li>
            <li><span>Operadora</span><b>${acc.isOperator ? 'Sí' : 'No'}</b></li>
            <li><span>Casa</span><b>${acc.householdId ? `<a href="#/familia/${esc(acc.householdId)}">${esc(acc.householdName)}</a>` : 'Sin casa'}</b></li>
            <li><span>Papel</span><b>${acc.householdId ? (acc.role === 'owner' ? 'Titular' : 'Adulto') : '—'}</b></li>
            <li><span>Alta</span><b>${esc(day(acc.createdAt))}</b></li>
            <li><span>Último acceso</span><b>${esc(ago(acc.lastSignIn))}</b></li>
          </ul>
        </div>
        <div class="card danger-zone"><div class="card-head"><h2>Eliminar cuenta</h2></div>
          ${canDelete ? `<p>Borra esta cuenta de autenticación. La persona dejará de poder entrar. Si es la única cuenta de su casa, la casa se queda sin nadie que la abra; en ese caso, mejor elimina la familia.</p>
          <p class="help">Tu cuenta y las de otras operadoras no se pueden borrar desde aquí.</p>
          <div class="actions"><button class="danger solid" type="button" data-action="delete-account" data-user="${esc(acc.userId)}" data-email="${esc(acc.email)}">Eliminar esta cuenta</button></div>`
          : `<p class="help">${acc.userId === me ? 'No puedes eliminar tu propia cuenta.' : 'Las cuentas de operadora no se pueden eliminar desde el panel.'}</p>`}</div>
      </section>`;
    layout('Ficha de cuenta', '', content);
  }

  // Artículos

  function articulosView() {
    if (editing) { layout(editing.id ? 'Editar artículo' : 'Nuevo artículo', '', editor(editing)); return; }
    const posts = data.posts || [];
    const content = `<section class="card flush">
      ${posts.length ? `<div class="table-wrap"><table><thead><tr><th>Título</th><th>Estado</th><th>Dirección</th><th>Actualizado</th><th></th></tr></thead><tbody>
        ${posts.map(post => `<tr><td><b>${esc(post.title)}</b><small>${esc(post.excerpt || '')}</small></td>
          <td>${post.status === 'published' ? '<span class="badge ok">Publicado</span>' : '<span class="badge off">Borrador</span>'}</td>
          <td>${post.status === 'published' ? `<a href="https://lahoma.app/blog/${esc(post.slug)}" target="_blank" rel="noopener">/blog/${esc(post.slug)}</a>` : esc(post.slug)}</td>
          <td>${esc(ago(post.updated_at))}</td>
          <td class="row-actions"><button class="quiet small" type="button" data-action="edit-post" data-id="${esc(post.id)}">Editar</button><button class="danger small" type="button" data-action="delete-post" data-id="${esc(post.id)}">Eliminar</button></td></tr>`).join('')}
      </tbody></table></div>` : '<div class="empty"><p class="help">No hay artículos. El primero puede quedarse en borrador hasta que esté listo.</p></div>'}</section>`;
    layout('Artículos', 'El blog de lahoma.app. Lo publicado aparece en la web en un minuto.', content,
      '<button class="button" type="button" data-action="new-post">Nuevo artículo</button>');
  }

  function editor(post) {
    const value = { title: '', slug: '', excerpt: '', seo_title: '', seo_description: '', body: '', status: 'draft', ...post };
    return `<form class="card" data-form="post">
      ${field('Título', 'title', value.title, 'required maxlength="140"')}
      ${field('Dirección', 'slug', value.slug, `required maxlength="80" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" ${value.id ? 'data-touched="1"' : ''}`)}
      ${field('Resumen', 'excerpt', value.excerpt, 'maxlength="300"')}
      <div class="fields-2">
        ${field('Título para buscadores', 'seo_title', value.seo_title, 'maxlength="70"')}
        ${field('Descripción para buscadores', 'seo_description', value.seo_description, 'maxlength="180"')}
      </div>
      <label class="field">Texto<textarea name="body" class="tall" maxlength="50000">${esc(value.body || '')}</textarea></label>
      <p class="help">Párrafos separados por una línea en blanco. # y ## para títulos. **negrita**, *cursiva* y [texto](https://ejemplo.com).</p>
      <div class="actions">
        <button class="quiet" type="submit" name="status" value="draft">${value.status === 'published' ? 'Pasar a borrador' : 'Guardar borrador'}</button>
        <button class="button" type="submit" name="status" value="published">${value.status === 'published' ? 'Guardar y publicar' : 'Publicar'}</button>
        <button class="quiet" type="button" data-action="cancel-post">Volver</button>
      </div>
    </form>`;
  }

  // Registro

  function registroView() {
    const rows = data.log || [];
    const content = `<section class="card flush">${rows.length ? `<div class="table-wrap"><table>
      <thead><tr><th>Cuándo</th><th>Quién</th><th>Qué</th><th>Sobre</th><th>Detalle</th></tr></thead><tbody>
      ${rows.map(entry => {
        const fields = (entry.detail?.fields || []).map(f => FIELDS[f] || f).join(', ');
        const detail = entry.detail?.account || fields || (entry.action === 'delete' && entry.targetType === 'household' ? `${plural(entry.detail?.accountsDeleted, 'cuenta borrada', 'cuentas borradas')}` : '');
        const exists = entry.targetType === 'household' && entry.action !== 'delete' && (data.households || []).some(row => row.id === entry.targetId);
        return `<tr><td>${esc(when(entry.createdAt))}</td><td>${esc(entry.operatorEmail)}</td><td>${esc(ACTIONS[entry.action] || entry.action)}</td>
          <td>${entry.targetType === 'account' ? 'Cuenta' : 'Familia'}<small>${exists ? `<a href="#/familia/${esc(entry.targetId)}">${esc(entry.targetLabel)}</a>` : esc(entry.targetLabel)}</small></td><td>${esc(detail)}</td></tr>`;
      }).join('')}</tbody></table></div>` : '<div class="empty"><p class="help">Todavía no se ha cambiado nada desde el panel.</p></div>'}</section>`;
    layout('Registro', 'Todo lo que se edita o se borra desde el panel queda apuntado aquí, con quién y cuándo.', content);
  }

  // Carga y navegación

  async function show() {
    const { section, id } = route();
    try {
      if (section === 'familias') {
        if (!data.households) { loading('Familias'); data.households = await rpc('homa_admin_households'); }
        familiasView();
      } else if (section === 'familia' && id) {
        if (!data.detail || data.detail.id !== id) { loading('Familia'); data.detail = await rpc('homa_admin_household', { p_id: id }); }
        familiaView();
      } else if (section === 'cuentas') {
        if (!data.accounts) { loading('Cuentas'); data.accounts = await rpc('homa_admin_accounts'); }
        cuentasView();
      } else if (section === 'cuenta' && id) {
        if (!data.accounts) { loading('Cuenta'); data.accounts = await rpc('homa_admin_accounts'); }
        data.account = (data.accounts || []).find(acc => acc.userId === id) || null;
        if (!data.account) { say('Esa cuenta no existe o ya se eliminó.', true); location.hash = '#/cuentas'; return; }
        cuentaView();
      } else if (section === 'articulos') {
        if (!data.posts) { loading('Artículos'); await loadPosts(); }
        articulosView();
      } else if (section === 'registro') {
        if (!data.log) { loading('Registro'); [data.log, data.households] = await Promise.all([rpc('homa_admin_log', { p_limit: 500 }), data.households || rpc('homa_admin_households')]); }
        registroView();
      } else {
        if (!data.dashboard) { loading('Resumen'); data.dashboard = await rpc('homa_admin_dashboard'); }
        resumenView();
      }
    } catch (err) {
      if (/MFA_REQUIRED|código de verificación/i.test(String(err.message || ''))) return;
      say(err.message, true);
      if (section === 'familia') { data.detail = null; location.hash = '#/familias'; return; }
      if (section === 'cuenta') { data.account = null; location.hash = '#/cuentas'; return; }
      layout('No se pudieron leer los datos', '', '<div class="card empty"><p class="help">Comprueba la conexión y pulsa Actualizar.</p></div>');
    }
  }

  async function loadPosts() {
    const result = await client.from('site_posts').select('id,slug,title,excerpt,body,seo_title,seo_description,status,published_at,updated_at').order('updated_at', { ascending: false });
    if (result.error) {
      if (errorText(result.error).includes('MFA_REQUIRED') || /policy|permission|rls|42501/i.test(errorText(result.error))) {
        await requireMfa('Escribe el código de tu app de verificación para continuar.');
        throw new Error(ERRORS.MFA_REQUIRED);
      }
      throw new Error(explain(result.error));
    }
    data.posts = result.data || [];
  }

  // Diálogo

  function ask(options) {
    const o = { confirm: 'Confirmar', danger: false, ...options };
    dialog.innerHTML = `<form data-form="dialog" class="dialog-body" novalidate>
      <h2>${esc(o.title)}</h2>
      ${o.text || ''}
      ${o.expect ? `<label class="field">${esc(o.expectLabel)}<input name="value" autocomplete="off" spellcheck="false"></label>` : ''}
      ${o.input ? `<label class="field">${esc(o.input.label)}<input name="value" type="${o.input.type || 'text'}" autocomplete="${o.input.autocomplete || 'off'}"></label>` : ''}
      ${o.checkbox ? `<label class="check"><input type="checkbox" name="checkbox"><span>${o.checkbox}</span></label>` : ''}
      <p class="dialog-error" id="dialog-error" role="alert"></p>
      <div class="actions end"><button type="button" class="quiet" data-action="dialog-cancel">Cancelar</button><button class="${o.danger ? 'danger solid' : 'button'}" type="submit">${esc(o.confirm)}</button></div>
    </form>`;
    dialog.showModal();
    const first = dialog.querySelector('input:not([type="checkbox"])');
    if (first) first.focus();
    return new Promise(resolve => { pending = { resolve, options: o }; });
  }

  function closeDialog(result) {
    if (!pending) return;
    const { resolve } = pending;
    pending = null;
    if (dialog.open) dialog.close();
    resolve(result);
  }

  function onDialogSubmit(form) {
    const o = pending?.options || {};
    const value = String(new FormData(form).get('value') || '').trim();
    const error = form.querySelector('#dialog-error');
    if (o.expect) {
      const ok = o.loose ? value.toLowerCase() === String(o.expect).toLowerCase() : value === String(o.expect).trim();
      if (!ok) { error.textContent = 'No coincide. Escríbelo exactamente igual.'; return; }
    }
    if (o.input?.minlength && value.length < o.input.minlength) { error.textContent = `Necesita al menos ${o.input.minlength} caracteres.`; return; }
    closeDialog({ value, checkbox: Boolean(form.querySelector('[name="checkbox"]')?.checked) });
  }

  // Acciones

  function download(name, rows) {
    const cell = value => {
      const text = String(value ?? '');
      return /[;"\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    };
    const csv = '\ufeff' + rows.map(row => row.map(cell).join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const stamp = () => new Date().toISOString().slice(0, 10);

  function exportFamilies() {
    const rows = filteredFamilies().map(row => {
      const c = row.contact || {};
      return [row.name, c.firstName, c.lastName, c.email, c.phone, (c.tags || []).join(', '), c.notes, row.adults, row.children, row.pets, row.accounts,
        day(row.createdAt), when(row.lastActivity), (STATUS[row.status] || ['—'])[0]];
    });
    download(`la-homa-familias-${stamp()}.csv`, [['Familia', 'Nombre', 'Apellidos', 'Correo', 'Teléfono', 'Etiquetas', 'Notas', 'Adultos', 'Niños', 'Mascotas', 'Cuentas', 'Alta', 'Última actividad', 'Estado'], ...rows]);
  }

  function exportAccounts() {
    const rows = filteredAccounts().map(acc => [acc.name, acc.email, provider(acc.provider), acc.householdName || '', acc.role === 'owner' ? 'Titular' : acc.role ? 'Adulto' : '',
      day(acc.createdAt), when(acc.lastSignIn), acc.confirmed ? 'Sí' : 'No', acc.isOperator ? 'Sí' : 'No']);
    download(`la-homa-cuentas-${stamp()}.csv`, [['Nombre', 'Correo', 'Entra con', 'Casa', 'Papel', 'Alta', 'Último acceso', 'Correo confirmado', 'Operadora'], ...rows]);
  }

  async function mutate(work, text) {
    try {
      const result = await work();
      invalidate();
      data.detail = result && result.id ? result : null;
      say(text);
    } catch (err) {
      say(err.message, true);
    }
    await show();
  }

  async function onDeleteFamily() {
    const h = data.detail;
    const others = (h.accountList || []).filter(acc => !acc.revokedAt && !acc.isOperator && acc.userId !== session.user.id).length;
    const answer = await ask({
      title: `Eliminar «${h.name}»`,
      text: `<p>Se borrarán la casa, sus ${plural(h.records, 'registro', 'registros')} en la nube, sus archivos y sus invitaciones. Las personas que entren después verán que ya no tienen casa.</p>`,
      expect: h.name,
      expectLabel: 'Para confirmar, escribe el nombre de la casa',
      checkbox: others ? `Borrar también ${plural(others, 'la cuenta de su adulto', 'las cuentas de sus adultos')}. Tu cuenta y las de otras operadoras no se tocan.` : '',
      confirm: 'Eliminar para siempre',
      danger: true
    });
    if (!answer) return;
    try {
      const result = await rpc('homa_admin_delete_household', { p_id: h.id, p_confirm: h.name, p_delete_accounts: answer.checkbox });
      if (Number(result?.filesQueued)) {
        const purge = await client.functions.invoke('homa-admin-purge', { body: {} });
        if (purge.error) say(`Familia eliminada, pero ${plural(result.filesQueued, 'archivo quedó', 'archivos quedaron')} pendiente de borrar. Se reintentará en el próximo borrado.`, true);
      }
      if (!flash.text) say(`«${h.name}» eliminada${Number(result?.accountsDeleted) ? ` junto con ${plural(result.accountsDeleted, 'cuenta', 'cuentas')}` : ''}.`);
      invalidate();
      data.detail = null;
      location.hash = '#/familias';
    } catch (err) {
      say(err.message, true);
      await show();
    }
  }

  async function onDeleteAccount(userId, email) {
    const answer = await ask({
      title: 'Eliminar cuenta',
      text: `<p>La cuenta <b>${esc(email)}</b> dejará de existir y no podrá entrar. Si es la única cuenta de su casa, la casa se queda sin nadie que la abra; en ese caso, mejor elimina la familia.</p>`,
      expect: email,
      loose: true,
      expectLabel: 'Para confirmar, escribe su correo',
      confirm: 'Eliminar cuenta',
      danger: true
    });
    if (!answer) return;
    const fromAccount = route().section === 'cuenta';
    const fromFamily = route().section === 'familia' && data.detail;
    try {
      await rpc('homa_admin_delete_account', { p_user: userId, p_confirm: email });
      say(`Cuenta ${email} eliminada.`);
      invalidate();
      data.account = null;
      if (fromFamily) {
        data.detail = await rpc('homa_admin_household', { p_id: data.detail.id });
        await show();
        return;
      }
      if (fromAccount) {
        location.hash = '#/cuentas';
        return;
      }
      await show();
    } catch (err) {
      say(err.message, true);
      await show();
    }
  }

  async function onRevoke(userId, email) {
    const answer = await ask({
      title: 'Quitar el acceso',
      text: `<p><b>${esc(email)}</b> no podrá abrir esta casa. Su cuenta sigue existiendo y puedes devolverle el acceso cuando quieras.</p>`,
      confirm: 'Quitar acceso',
      danger: true
    });
    if (!answer) return;
    await mutate(() => rpc('homa_admin_set_access', { p_household: data.detail.id, p_user: userId, p_active: false }), 'Acceso retirado.');
  }

  async function onPassword() {
    const answer = await ask({ title: 'Cambiar contraseña', text: '<p class="help">Al menos 10 caracteres. Se aplica a tu cuenta de operadora.</p>', input: { label: 'Nueva contraseña', type: 'password', autocomplete: 'new-password', minlength: 10 }, confirm: 'Cambiar' });
    if (!answer) return;
    const result = await client.auth.updateUser({ password: answer.value });
    say(result.error ? 'No se pudo cambiar la contraseña.' : 'Contraseña cambiada.', Boolean(result.error));
    await show();
  }

  async function onAction(target) {
    const { action, id, user, email } = target.dataset;
    if (action === 'open-family') { location.hash = `#/familia/${id}`; return; }
    if (action === 'open-account') { location.hash = `#/cuenta/${user}`; return; }
    if (action === 'reload') { invalidate(); data.posts = null; data.account = null; if (data.detail) data.detail = null; await show(); return; }
    if (action === 'logout') { await logout(); return; }
    if (action === 'boot') { await boot(); return; }
    if (action === 'password') { await onPassword(); return; }
    if (action === 'dialog-cancel') { closeDialog(null); return; }
    if (action === 'export-families') { exportFamilies(); return; }
    if (action === 'export-accounts') { exportAccounts(); return; }
    if (action === 'delete-family') { await onDeleteFamily(); return; }
    if (action === 'delete-account') { await onDeleteAccount(user, email); return; }
    if (action === 'revoke-access') { await onRevoke(user, email); return; }
    if (action === 'restore-access') { await mutate(() => rpc('homa_admin_set_access', { p_household: data.detail.id, p_user: user, p_active: true }), 'Acceso devuelto.'); return; }
    if (action === 'revoke-invitation') { await mutate(() => rpc('homa_admin_revoke_invitation', { p_id: id }), 'Invitación anulada.'); return; }
    if (action === 'revoke-device') { await mutate(() => rpc('homa_admin_revoke_device', { p_id: id }), 'Dispositivo desconectado.'); return; }
    if (action === 'new-post') { editing = {}; articulosView(); return; }
    if (action === 'edit-post') { editing = (data.posts || []).find(post => post.id === id) || null; articulosView(); return; }
    if (action === 'cancel-post') { editing = null; articulosView(); return; }
    if (action === 'delete-post') {
      const post = (data.posts || []).find(item => item.id === id);
      const answer = await ask({ title: 'Eliminar artículo', text: `<p>«${esc(post?.title || '')}» desaparecerá del blog y del panel.</p>`, confirm: 'Eliminar', danger: true });
      if (!answer) return;
      const result = await client.from('site_posts').delete().eq('id', id);
      say(result.error ? 'No se pudo eliminar.' : 'Artículo eliminado.', Boolean(result.error));
      data.posts = null;
      data.dashboard = null;
      await show();
    }
  }

  function readPost(form, status) {
    const values = new FormData(form);
    const title = String(values.get('title') || '').trim();
    const slug = slugify(String(values.get('slug') || title));
    const row = {
      title,
      slug,
      excerpt: String(values.get('excerpt') || '').trim(),
      seo_title: String(values.get('seo_title') || '').trim(),
      seo_description: String(values.get('seo_description') || '').trim(),
      body: String(values.get('body') || ''),
      status: status === 'published' ? 'published' : 'draft'
    };
    if (title.length < 1 || title.length > 140) throw new Error('El título tiene que caber en 140 caracteres.');
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length < 3) throw new Error('La dirección necesita al menos 3 letras o números, separados por guiones.');
    return row;
  }

  async function onSubmit(form, submitter) {
    const kind = form.dataset.form;
    const values = new FormData(form);
    if (kind === 'dialog') { onDialogSubmit(form); return; }
    if (kind === 'login') {
      const result = await client.auth.signInWithPassword({ email: String(values.get('email') || ''), password: String(values.get('password') || '') });
      if (result.error) { login('Correo o contraseña incorrectos.', true); return; }
      session = result.data.session;
      await boot();
      return;
    }
    if (kind === 'mfa') {
      const code = String(values.get('code') || '').replace(/\s/g, '');
      if (!/^\d{6}$/.test(code)) { mfaGate('El código tiene seis cifras.', true); return; }
      const verified = await client.auth.mfa.challengeAndVerify({ factorId: mfa.factorId, code });
      if (verified.error) { mfaGate('Ese código no vale. Espera al siguiente y vuelve a probar.', true); return; }
      mfa = null;
      session = verified.data.session || (await client.auth.getSession()).data.session;
      if (!hasAal2(session)) {
        const refreshed = await client.auth.refreshSession();
        if (refreshed.error || !hasAal2(refreshed.data.session)) {
          mfaGate('El código valió, pero la sesión no se ha elevado. Prueba otro código o vuelve a entrar.', true);
          return;
        }
        session = refreshed.data.session;
      }
      await boot();
      return;
    }
    if (kind === 'contact') {
      const contact = {
        firstName: String(values.get('firstName') || ''),
        lastName: String(values.get('lastName') || ''),
        email: String(values.get('email') || ''),
        phone: String(values.get('phone') || ''),
        notes: String(values.get('notes') || ''),
        tags: String(values.get('tags') || '').split(',').map(tag => tag.trim()).filter(Boolean)
      };
      await mutate(() => rpc('homa_admin_update_household', { p_id: data.detail.id, p_patch: { contact } }), 'Contacto guardado.');
      return;
    }
    if (kind === 'house') {
      const patch = { name: String(values.get('name') || ''), timezone: String(values.get('timezone') || '') };
      await mutate(() => rpc('homa_admin_update_household', { p_id: data.detail.id, p_patch: patch }), 'Datos de la casa guardados.');
      return;
    }
    if (kind === 'post') {
      const status = submitter?.value || 'draft';
      try {
        const row = readPost(form, status);
        const result = editing?.id ? await client.from('site_posts').update(row).eq('id', editing.id) : await client.from('site_posts').insert(row);
        if (result.error) throw new Error(/duplicate|unique/i.test(result.error.message || '') ? 'Ya hay un artículo con esa dirección.' : explain(result.error));
        say(row.status === 'published' ? 'Publicado. En un minuto estará en la web.' : 'Borrador guardado.');
        editing = null;
        data.posts = null;
        data.dashboard = null;
        await show();
      } catch (err) {
        editing = { ...(editing || {}), ...Object.fromEntries(['title', 'slug', 'excerpt', 'seo_title', 'seo_description', 'body'].map(key => [key, String(values.get(key) || '')])) };
        say(err.message, true);
        articulosView();
      }
    }
  }

  function onFilter(input) {
    ui[input.dataset.filter] = input.value;
    const rows = document.querySelector('#rows');
    if (!rows) return;
    rows.innerHTML = route().section === 'cuentas' ? accountRows() : familyRows();
  }

  async function logout(notice) {
    clearTimeout(idleTimer);
    await client.auth.signOut();
    session = null;
    editing = null;
    mfa = null;
    for (const key of Object.keys(data)) data[key] = null;
    login(typeof notice === 'string' ? notice : '');
  }

  async function boot() {
    if (!cfg.url || !cfg.anonKey || !window.supabase) {
      gate('El panel no está configurado', '<p class="lede">Falta la configuración pública o no se ha podido cargar el acceso.</p>');
      return;
    }
    if (!client) {
      client = window.supabase.createClient(cfg.url, cfg.anonKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' }
      });
    }
    const current = await client.auth.getSession();
    session = current.data.session;
    if (!session) { login(''); return; }
    const role = await client.rpc('homa_is_operator');
    if (role.error) {
      const missing = /function|schema cache|PGRST202|does not exist/i.test(role.error.message || '');
      gate(missing ? 'Falta preparar la base' : 'No se pudo comprobar el acceso', `<p class="lede">${missing ? 'Ejecuta en Supabase las migraciones de supabase/migrations y vuelve a abrir el panel.' : esc(role.error.message || 'Error de acceso.')}</p><div class="actions"><button class="quiet" type="button" data-action="logout">Salir</button></div>`);
      return;
    }
    if (!role.data) { denied(); return; }
    if (!hasAal2(session)) {
      await requireMfa('');
      return;
    }
    touch();
    await show();
  }

  for (const type of ['click', 'keydown']) document.addEventListener(type, touch, { passive: true });
  document.addEventListener('click', event => {
    const target = event.target.closest('[data-action]');
    if (!target) return;
    if (target.dataset.action === 'open-family' && event.target.closest('a, button')) return;
    if (target.dataset.action === 'open-account' && event.target.closest('a, button')) return;
    event.preventDefault();
    onAction(target);
  });
  document.addEventListener('submit', event => {
    const form = event.target.closest('form[data-form]');
    if (!form) return;
    event.preventDefault();
    onSubmit(form, event.submitter);
  });
  document.addEventListener('input', event => {
    const target = event.target;
    if (target.matches('[data-filter]')) { onFilter(target); return; }
    const form = target.closest('form[data-form="post"]');
    if (!form) return;
    const slug = form.querySelector('[name="slug"]');
    if (target.name === 'slug') slug.dataset.touched = '1';
    if (target.name === 'title' && slug && !slug.dataset.touched) slug.value = slugify(target.value);
  });
  dialog.addEventListener('close', () => closeDialog(null));
  dialog.addEventListener('click', event => { if (event.target === dialog) closeDialog(null); });
  window.addEventListener('hashchange', () => {
    if (!session) return;
    editing = null;
    if (!hasAal2(session)) { requireMfa(''); return; }
    show();
  });

  boot();
})();
