(function () {
  'use strict';
  const app = document.querySelector('#app');
  const cfg = window.HOMA_PUBLIC || {};
  let client = null;
  let session = null;
  let view = 'resumen';
  let posts = [];
  let overview = null;
  let editing = null;
  let message = '';
  let error = '';

  const esc = value => String(value ?? '').replace(/[&<>"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));
  const slugify = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
  const when = value => {
    if (!value) return 'Sin actividad';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Sin actividad';
    return new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
  };
  const provider = value => value === 'google' ? 'Google' : 'Correo';

  function paint(html, mode) {
    app.className = mode || 'shell';
    app.innerHTML = html;
  }

  function gate(title, body) {
    paint(`<div class="card"><div class="brand"><span class="mark"></span><span>La Homa<small>Panel</small></span></div><h1>${title}</h1>${body}</div>`, 'gate');
  }

  function login(notice) {
    gate('Entra para administrar', `
      <p class="lede">Correo o Google. Es la misma cuenta de la app. Solo una cuenta marcada como operadora abre el panel.</p>
      ${notice ? `<div class="note ${error ? 'bad' : ''}">${esc(notice)}</div>` : ''}
      <form id="login">
        <label class="field">Correo<input name="email" type="email" autocomplete="username" required maxlength="254"></label>
        <label class="field">Contraseña<input name="password" type="password" autocomplete="current-password" required minlength="6" maxlength="200"></label>
        <div class="actions"><button class="button wide" type="submit">Entrar</button></div>
      </form>
      <div class="actions"><button class="quiet" type="button" id="google">Continuar con Google</button><button class="quiet" type="button" id="forgot">He olvidado mi contraseña</button></div>`);
    document.querySelector('#login').addEventListener('submit', onLogin);
    document.querySelector('#google').addEventListener('click', onGoogle);
    document.querySelector('#forgot').addEventListener('click', onForgot);
  }

  function operatorInstructions() {
    const email = session?.user?.email || '';
    const sql = `insert into public.homa_operators (user_id)\nselect id from auth.users\nwhere lower(email) = lower('${email.replace(/'/g, "''")}')\non conflict (user_id) do nothing;`;
    gate('Falta marcarte como operador', `
      <p class="lede">Has entrado como ${esc(email || 'esta cuenta')}. El panel todavía no te reconoce.</p>
      <p class="help">Abre el editor SQL de Supabase y ejecuta esto una sola vez. Luego vuelve y pulsa Comprobar.</p>
      <pre id="sql">${esc(sql)}</pre>
      <div class="actions"><button class="button" type="button" id="copy">Copiar</button><button class="quiet" type="button" id="check">Comprobar</button><button class="quiet" type="button" id="out">Salir</button></div>`);
    document.querySelector('#copy').addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(sql); message = 'Copiado.'; } catch { message = 'Selecciona el texto y cópialo a mano.'; }
      operatorInstructions();
    });
    document.querySelector('#check').addEventListener('click', boot);
    document.querySelector('#out').addEventListener('click', logout);
  }

  function shell() {
    const totals = overview?.totals || {};
    const households = overview?.households || [];
    const signups = overview?.signups || [];
    paint(`
      <header class="top">
        <div class="brand"><span class="mark"></span><span>La Homa<small>Panel</small></span></div>
        <div class="actions"><span class="help">${esc(session.user.email || '')}</span><button class="quiet" type="button" id="password">Nueva contraseña</button><button class="quiet" type="button" id="out">Salir</button></div>
      </header>
      ${message ? `<div class="note">${esc(message)}</div>` : ''}${error ? `<div class="note bad">${esc(error)}</div>` : ''}
      <nav class="tabs" aria-label="Secciones del panel">
        <button class="quiet" type="button" data-view="resumen" aria-current="${view === 'resumen'}">Resumen</button>
        <button class="quiet" type="button" data-view="familias" aria-current="${view === 'familias'}">Familias</button>
        <button class="quiet" type="button" data-view="articulos" aria-current="${view === 'articulos'}">Artículos</button>
      </nav>
      ${view === 'resumen' ? resumen(totals, signups) : ''}
      ${view === 'familias' ? familias(households) : ''}
      ${view === 'articulos' ? articulos() : ''}`);
    document.querySelector('#out').addEventListener('click', logout);
    document.querySelector('#password').addEventListener('click', onPassword);
    for (const button of document.querySelectorAll('[data-view]')) button.addEventListener('click', () => { view = button.dataset.view; editing = null; message = ''; error = ''; shell(); });
    const form = document.querySelector('#post-form');
    if (form) form.addEventListener('submit', onSave);
    const title = document.querySelector('[name="title"]');
    const slug = document.querySelector('[name="slug"]');
    if (title && slug && !editing) title.addEventListener('input', () => { if (!slug.dataset.touched) slug.value = slugify(title.value); });
    if (slug) slug.addEventListener('input', () => { slug.dataset.touched = '1'; });
    for (const button of document.querySelectorAll('[data-edit]')) button.addEventListener('click', () => { editing = posts.find(post => post.id === button.dataset.edit) || null; view = 'articulos'; shell(); });
    for (const button of document.querySelectorAll('[data-delete]')) button.addEventListener('click', () => onDelete(button.dataset.delete));
    const fresh = document.querySelector('#new-post');
    if (fresh) fresh.addEventListener('click', () => { editing = {}; view = 'articulos'; shell(); });
    const cancel = document.querySelector('#cancel-post');
    if (cancel) cancel.addEventListener('click', () => { editing = null; shell(); });
  }

  function resumen(totals, signups) {
    return `<section class="stats">
      <div class="stat"><b>${Number(totals.households || 0)}</b><span>Familias</span></div>
      <div class="stat"><b>${Number(totals.accounts || 0)}</b><span>Cuentas</span></div>
      <div class="stat"><b>${Number(totals.postsPublished || 0)}</b><span>Artículos publicados</span></div>
      <div class="stat"><b>${Number(totals.postsDraft || 0)}</b><span>Borradores</span></div>
    </section>
    <section class="panel"><h2>Altas de los últimos 7 días</h2><p class="help">Son cuentas adultas. No son los nombres de los niños.</p>${signupTable(signups)}</section>`;
  }

  function signupTable(signups) {
    if (!signups.length) return '<p class="help">No hay altas esta semana.</p>';
    return `<div class="table-wrap"><table><thead><tr><th>Cuenta</th><th>Acceso</th><th>Casa</th><th>Fecha</th></tr></thead><tbody>
      ${signups.map(row => `<tr><td>${esc(row.email)}</td><td>${provider(row.provider)}</td><td>${row.hasHome ? 'Con casa' : 'Sin casa'}</td><td>${esc(when(row.createdAt))}</td></tr>`).join('')}
    </tbody></table></div>`;
  }

  function familias(households) {
    if (!households.length) return '<section class="panel"><h2>Familias</h2><p class="help">Todavía no hay casas creadas.</p></section>';
    return `<section class="panel"><h2>Familias activas</h2><p class="help">Nombre de la casa, tamaño y última actividad. Sin nombres, dinero, custodia ni fotos.</p>
      <div class="table-wrap"><table><thead><tr><th>Casa</th><th>Adultos</th><th>Niños</th><th>Mascotas</th><th>Cuentas</th><th>Creada</th><th>Actividad</th></tr></thead><tbody>
        ${households.map(row => `<tr><td>${esc(row.name)}</td><td>${Number(row.adults || 0)}</td><td>${Number(row.children || 0)}</td><td>${Number(row.pets || 0)}</td><td>${Number(row.accounts || 0)}</td><td>${esc(when(row.createdAt))}</td><td>${esc(when(row.lastActivity))}</td></tr>`).join('')}
      </tbody></table></div></section>`;
  }

  function articulos() {
    if (editing) return editor(editing.id ? editing : null);
    return `<section class="panel"><div class="top"><h2>Artículos</h2><button class="button" type="button" id="new-post">Nuevo</button></div>
      ${posts.length ? `<div class="table-wrap"><table><thead><tr><th>Título</th><th>Estado</th><th>Dirección</th><th></th></tr></thead><tbody>
        ${posts.map(post => `<tr><td>${esc(post.title)}</td><td>${post.status === 'published' ? 'Publicado' : 'Borrador'}</td><td>${post.status === 'published' ? `<a href="https://lahoma.app/blog/${esc(post.slug)}">/blog/${esc(post.slug)}</a>` : esc(post.slug)}</td><td class="row-actions"><button class="quiet" type="button" data-edit="${esc(post.id)}">Editar</button><button class="danger" type="button" data-delete="${esc(post.id)}">Eliminar</button></td></tr>`).join('')}
      </tbody></table></div>` : '<p class="help">No hay artículos. El primero puede quedarse en borrador.</p>'}</section>`;
  }

  function editor(post) {
    const value = post || { title: '', slug: '', excerpt: '', seo_title: '', seo_description: '', body: '', status: 'draft' };
    return `<form id="post-form" class="panel"><h2>${post ? 'Editar artículo' : 'Nuevo artículo'}</h2>
      <label class="field">Título<input name="title" required maxlength="140" value="${esc(value.title)}"></label>
      <label class="field">Dirección<input name="slug" required maxlength="80" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value="${esc(value.slug)}" ${post ? 'data-touched="1"' : ''}></label>
      <label class="field">Resumen<input name="excerpt" maxlength="300" value="${esc(value.excerpt || '')}"></label>
      <label class="field">Título para buscadores<input name="seo_title" maxlength="70" value="${esc(value.seo_title || '')}"></label>
      <label class="field">Descripción para buscadores<textarea name="seo_description" maxlength="180">${esc(value.seo_description || '')}</textarea></label>
      <label class="field">Texto<textarea name="body" maxlength="50000">${esc(value.body || '')}</textarea></label>
      <p class="help">Párrafos separados por una línea en blanco. # y ## para títulos. **negrita**, *cursiva* y [texto](https://ejemplo.com).</p>
      <div class="actions">
        <button class="quiet" type="submit" name="status" value="draft">Guardar borrador</button>
        <button class="button" type="submit" name="status" value="published">Publicar</button>
        ${post && post.status === 'published' ? '<button class="quiet" type="submit" name="status" value="draft">Despublicar</button>' : ''}
        <button class="quiet" type="button" id="cancel-post">Volver</button>
      </div>
    </form>`;
  }

  async function onLogin(event) {
    event.preventDefault();
    error = '';
    const data = new FormData(event.currentTarget);
    const result = await client.auth.signInWithPassword({ email: String(data.get('email') || ''), password: String(data.get('password') || '') });
    if (result.error) { error = 'Correo o contraseña incorrectos.'; login(error); return; }
    session = result.data.session;
    await boot();
  }

  async function onGoogle() {
    error = '';
    const result = await client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + '/', queryParams: { prompt: 'select_account' } } });
    if (result.error) { error = 'Google no ha abierto el acceso.'; login(error); }
  }

  async function onForgot() {
    const email = document.querySelector('[name="email"]')?.value || '';
    if (!email) { login('Escribe el correo y vuelve a pedir la contraseña.'); return; }
    const result = await client.auth.resetPasswordForEmail(email, { redirectTo: location.origin + '/' });
    login(result.error ? 'No se pudo enviar el correo.' : 'Si la cuenta existe, llega un correo para elegir otra contraseña.');
  }

  async function onPassword() {
    const password = window.prompt('Nueva contraseña, al menos 10 caracteres');
    if (!password) return;
    if (password.length < 10) { error = 'La contraseña nueva necesita 10 caracteres.'; shell(); return; }
    const result = await client.auth.updateUser({ password });
    error = '';
    message = result.error ? 'No se pudo cambiar la contraseña.' : 'Contraseña cambiada.';
    shell();
  }

  async function logout() {
    await client.auth.signOut();
    session = null;
    overview = null;
    posts = [];
    editing = null;
    message = '';
    error = '';
    login('');
  }

  function readPost(form, status) {
    const data = new FormData(form);
    const title = String(data.get('title') || '').trim();
    const slug = slugify(String(data.get('slug') || title));
    const row = {
      title,
      slug,
      excerpt: String(data.get('excerpt') || '').trim(),
      seo_title: String(data.get('seo_title') || '').trim(),
      seo_description: String(data.get('seo_description') || '').trim(),
      body: String(data.get('body') || ''),
      status: status === 'published' ? 'published' : 'draft'
    };
    if (title.length < 1 || title.length > 140) throw new Error('El título tiene que caber en 140 caracteres.');
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length < 3) throw new Error('La dirección necesita al menos 3 letras o números, separados por guiones.');
    return row;
  }

  async function onSave(event) {
    event.preventDefault();
    const status = event.submitter?.value || 'draft';
    try {
      const row = readPost(event.currentTarget, status);
      const query = editing?.id
        ? client.from('site_posts').update(row).eq('id', editing.id)
        : client.from('site_posts').insert(row);
      const result = await query;
      if (result.error) throw new Error(result.error.message || 'No se pudo guardar.');
      message = row.status === 'published' ? 'Publicado. En un minuto estará en la web.' : 'Borrador guardado.';
      error = '';
      editing = null;
      await loadData();
      view = 'articulos';
      shell();
    } catch (err) {
      const data = new FormData(event.currentTarget);
      editing = {
        ...(editing || {}),
        title: String(data.get('title') || ''),
        slug: String(data.get('slug') || ''),
        excerpt: String(data.get('excerpt') || ''),
        seo_title: String(data.get('seo_title') || ''),
        seo_description: String(data.get('seo_description') || ''),
        body: String(data.get('body') || '')
      };
      error = err.message || 'No se pudo guardar.';
      shell();
    }
  }

  async function onDelete(id) {
    if (!window.confirm('¿Eliminar este artículo?')) return;
    const result = await client.from('site_posts').delete().eq('id', id);
    if (result.error) { error = 'No se pudo eliminar.'; shell(); return; }
    message = 'Artículo eliminado.';
    error = '';
    editing = null;
    await loadData();
    shell();
  }

  async function loadData() {
    const [home, blog] = await Promise.all([
      client.rpc('homa_operator_overview'),
      client.from('site_posts').select('id,slug,title,excerpt,body,seo_title,seo_description,status,published_at,updated_at').order('updated_at', { ascending: false })
    ]);
    if (home.error) throw new Error(home.error.message || 'No se pudo leer el resumen.');
    if (blog.error) throw new Error(blog.error.message || 'No se pudieron leer los artículos.');
    overview = home.data || { totals: {}, households: [], signups: [] };
    posts = blog.data || [];
  }

  async function boot() {
    message = '';
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
    if (!session) { login(error); return; }
    const role = await client.rpc('homa_is_operator');
    if (role.error) {
      const missing = /function|schema cache|PGRST202|does not exist/i.test(role.error.message || '');
      gate(missing ? 'Falta preparar la base' : 'No se pudo comprobar el acceso', `<p class="lede">${missing ? 'En el editor SQL de Supabase, ejecuta el archivo supabase/migrations/0003_site_and_operators.sql y vuelve a abrir el panel.' : esc(role.error.message || 'Error de acceso.')}</p><div class="actions"><button class="quiet" type="button" id="out">Salir</button></div>`);
      document.querySelector('#out').addEventListener('click', logout);
      return;
    }
    if (!role.data) { operatorInstructions(); return; }
    try {
      await loadData();
      error = '';
      shell();
    } catch (err) {
      error = err.message || 'No se pudieron cargar los datos.';
      shell();
    }
  }

  boot();
})();
