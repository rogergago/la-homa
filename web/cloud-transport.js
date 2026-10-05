/* Household sync for La Homa. Talks to Supabase as the signed-in adult.
   Writes go through security-definer functions, not direct table updates.
   The browser never receives a secret key. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.HomaCloudTransport = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const version = 5;
  const keyOf = (kind, id) => kind + '\u0000' + id;
  const clone = x => JSON.parse(JSON.stringify(x));
  function canon(x) {
    if (Array.isArray(x)) return x.map(canon);
    if (x && typeof x === 'object') return Object.fromEntries(Object.keys(x).sort().map(k => [k, canon(x[k])]));
    return x;
  }
  const same = (a, b) => JSON.stringify(canon(a)) === JSON.stringify(canon(b));
  function rowId(row) { return row && (row.id || row.memberId) ? String(row.id || row.memberId) : ''; }

  function project(state) {
    const Sync = globalThis.HomaSync;
    if (!Sync) throw new Error('Falta el módulo de sincronización.');
    const rows = Sync.entities(state);
    const arrays = [];
    const order = {};
    const finance = {};
    const weekTasks = {};
    for (const [key, value] of Object.entries(state)) {
      if (key === 'weeks' && Array.isArray(value)) {
        arrays.push('weeks');
        for (const week of value) weekTasks[week.id] = (week.tasks || []).map(task => task.id);
      } else if (key === 'finance' && value && typeof value === 'object' && !Array.isArray(value)) {
        for (const [type, items] of Object.entries(value)) {
          if (!Array.isArray(items)) throw new Error('No se puede guardar la parte financiera «' + type + '».');
          finance[type] = items.map(rowId);
        }
      } else if (Array.isArray(value)) {
        arrays.push(key);
        order[key] = value.map(rowId);
      }
    }
    rows.push({ kind: 'shape', id: 'root', data: { arrays, order, finance, weekTasks } });
    return rows;
  }

  function assemble(rows) {
    const byKind = new Map();
    for (const row of rows) {
      const kind = row.kind;
      if (!byKind.has(kind)) byKind.set(kind, []);
      byKind.get(kind).push(row);
    }
    const shape = (byKind.get('shape') || []).find(row => row.id === 'root');
    const spec = shape?.data || {};
    const state = {};
    for (const row of byKind.get('meta') || []) state[row.id] = clone(row.data);
    const arrayNames = spec.arrays || [...byKind.keys()].filter(kind => !['meta', 'shape', 'tasks', 'weeks'].includes(kind) && !kind.startsWith('finance.'));
    for (const key of arrayNames) {
      if (key === 'weeks') continue;
      const items = new Map((byKind.get(key) || []).map(row => [String(row.id), clone(row.data)]));
      const ordered = [];
      for (const id of spec.order?.[key] || []) if (items.has(String(id))) ordered.push(items.get(String(id)));
      for (const [id, data] of items) if (!(spec.order?.[key] || []).map(String).includes(id)) ordered.push(data);
      state[key] = ordered;
    }
    const weeks = new Map();
    for (const row of byKind.get('weeks') || []) weeks.set(String(row.id), { ...clone(row.data), tasks: [] });
    const taskRows = new Map((byKind.get('tasks') || []).map(row => [String(row.id), row]));
    for (const [weekId, week] of weeks) {
      const wanted = spec.weekTasks?.[weekId] || [];
      const used = new Set();
      for (const id of wanted) {
        const row = taskRows.get(String(id));
        if (!row) continue;
        const task = clone(row.data);
        delete task.weekId;
        week.tasks.push(task);
        used.add(String(id));
      }
      for (const [id, row] of taskRows) {
        if (used.has(id) || String(row.data.weekId) !== weekId) continue;
        const task = clone(row.data);
        delete task.weekId;
        week.tasks.push(task);
      }
    }
    if (arrayNames.includes('weeks') || weeks.size) state.weeks = [...weeks.values()];
    const financeNames = spec.finance ? Object.keys(spec.finance) : [...byKind.keys()].filter(kind => kind.startsWith('finance.')).map(kind => kind.slice(8));
    if (financeNames.length || [...byKind.keys()].some(kind => kind.startsWith('finance.'))) {
      state.finance = {};
      for (const type of financeNames) {
        const items = new Map((byKind.get('finance.' + type) || []).map(row => [String(row.id), clone(row.data)]));
        const ordered = [];
        for (const id of spec.finance?.[type] || []) if (items.has(String(id))) ordered.push(items.get(String(id)));
        for (const [id, data] of items) if (!(spec.finance?.[type] || []).map(String).includes(id)) ordered.push(data);
        state.finance[type] = ordered;
      }
    }
    return state;
  }

  function explain(error) {
    const msg = error?.message || String(error || '');
    if (/VERSION_CONFLICT/.test(msg)) return 'Otro dispositivo ha cambiado este dato. Pulsa «Recargar desde la nube» y repite el cambio.';
    if (/INVITE_INVALID/.test(msg)) return 'El código de invitación no es válido, ya se usó o ha caducado.';
    if (/INVITE_EMAIL_MISMATCH/.test(msg)) return 'Esta invitación es para otro correo. Entra con el correo invitado.';
    if (/INVALID_EMAIL/.test(msg)) return 'Revisa el correo de la invitación.';
    if (/ALREADY_IN_HOUSEHOLD/.test(msg)) return 'Esta cuenta ya pertenece a un hogar.';
    if (/TOO_MANY_ATTEMPTS/.test(msg)) return 'Demasiados códigos incorrectos. Espera una hora o pide un código nuevo.';
    if (/TOO_MANY_INVITES/.test(msg)) return 'Ya hay 10 invitaciones sin usar. Espera a que se usen o caduquen.';
    if (/QUOTA_EXCEEDED/.test(msg)) return 'El hogar ha llegado al límite de espacio en la nube. Quita fotos o datos antiguos.';
    if (/INVALID_COMMAND/.test(msg)) return 'La nube ha rechazado un dato con un formato no válido.';
    if (/FORBIDDEN/.test(msg)) return 'No tienes permiso para cambiar este hogar.';
    if (/Invalid login/.test(msg)) return 'No se pudo acceder. Revisa correo, contraseña y confirmación del correo.';
    return msg || 'No se pudo guardar en la nube.';
  }

  const transport = {
    version,
    project,
    assemble,
    canon,
    householdId: null,
    client: null,
    known: new Map(),
    saving: false,
    refreshAgain: false,
    channel: null,
    async clientFor(session) {
      const bundled = globalThis.FAMILY_CLOUD?.url && globalThis.FAMILY_CLOUD?.anonKey ? globalThis.FAMILY_CLOUD : null;
      const cfg = !bundled && typeof localStorage !== 'undefined' && localStorage.getItem('family-points-v3-cloud-config')
        ? JSON.parse(localStorage.getItem('family-points-v3-cloud-config') || 'null')
        : null;
      const cloud = bundled || cfg;
      if (!cloud?.url || !cloud?.anonKey) throw new Error('Falta la configuración pública de Supabase.');
      if (!globalThis.supabase) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = './supabase.js';
          script.onload = resolve;
          script.onerror = () => reject(new Error('No se pudo cargar el servicio de acceso.'));
          document.head.appendChild(script);
        });
      }
      if (!this.client) {
        this.client = globalThis.supabase.createClient(cloud.url, cloud.anonKey, {
          auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' }
        });
      }
      if (session?.access_token && session?.refresh_token) {
        const { error } = await this.client.auth.setSession({ access_token: session.access_token, refresh_token: session.refresh_token });
        if (error) throw error;
      }
      return this.client;
    },
    remember(rows) {
      this.known = new Map(rows.map(row => [keyOf(row.kind, row.id), { revision: Number(row.revision) || 0, data: clone(row.data) }]));
    },
    async activate(session, name, inviteCode) {
      const client = await this.clientFor(session);
      const code = String(inviteCode || '').trim().toLowerCase();
      let inviteMeta = null;
      if (code) {
        const { data: joined, error } = await client.rpc('homa_accept', { p_code: code });
        if (error) throw new Error(explain(error));
        if (!joined) throw new Error(explain('INVITE_INVALID'));
        inviteMeta = typeof joined === 'object' ? joined : { householdId: joined };
      }
      const { data: householdId, error } = await client.rpc('homa_bootstrap', { p_name: String(name || 'Mi hogar').slice(0, 120) });
      if (error) throw new Error(explain(error));
      this.householdId = householdId;
      const rows = await this.pull();
      let state = rows.length ? assemble(rows) : null;
      if (!state) {
        const Core = globalThis.FamilyCore;
        state = Core.seed();
        state.demo = false;
        state.settings.familyName = 'Familia de ' + (name || 'casa');
        state.settings.pin = null;
        state.settings.teamReward = 'Un plan en familia';
        state.settings.allowAdultsSwitchProfiles = false;
        const member = { id: Core.uid('member'), name: name || 'Adulto', avatar: '🧑', color: '#8b6ce0', role: 'adult', age: null, birthday: '', phone: '', active: true };
        state.settings.familyReady = false;
        state.members = [member];
        for (const key of ['templates', 'rewards', 'weeks', 'events', 'shopping', 'mealPlan', 'routines', 'absences', 'swaps', 'preparations', 'pantry', 'vouchers', 'meetings', 'houseLog', 'presencePlans', 'presenceOverrides', 'taskReviewRequests', 'savedMenus', 'eventFiles', 'notifications', 'usualProducts']) state[key] = [];
        state.finance = { accounts: [], ledger: [], dues: [], requests: [], goals: [], labs: [], savingsPlans: [] };
        Core.generateWeek(state, Core.monday());
        state.updatedAt = new Date().toISOString();
        Core.validateState(state);
      }
      const link = await this.myLink();
      this.listen();
      return { state, householdId, revision: 0, membership: link, invite: inviteMeta };
    },
    async pull() {
      const { data, error } = await this.client.rpc('homa_pull');
      if (error) throw new Error(explain(error));
      const rows = Array.isArray(data) ? data : [];
      this.remember(rows);
      return rows;
    },
    async save(snapshot) {
      if (!this.client || !this.householdId) throw new Error('No hay sesión en la nube.');
      this.saving = true;
      try {
        const next = new Map(project(snapshot).map(row => [keyOf(row.kind, row.id), row]));
        const changes = [];
        for (const [key, row] of next) {
          const prev = this.known.get(key);
          if (!prev || !same(prev.data, row.data)) changes.push({ kind: row.kind, id: row.id, after: row.data, expectedRevision: prev?.revision || 0 });
        }
        for (const [key, prev] of this.known) {
          if (next.has(key)) continue;
          const [kind, id] = key.split('\u0000');
          changes.push({ kind, id, after: null, expectedRevision: prev.revision });
        }
        for (let i = 0; i < changes.length; i += 200) {
          const part = changes.slice(i, i + 200);
          const { data, error } = await this.client.rpc('homa_push', { changes: part });
          if (error) throw new Error(explain(error));
          for (const row of data || []) {
            const key = keyOf(row.kind, row.id);
            if (row.revision == null) this.known.delete(key);
            else {
              const source = next.get(key);
              this.known.set(key, { revision: Number(row.revision), data: source ? clone(source.data) : this.known.get(key)?.data });
            }
          }
        }
      } finally {
        this.saving = false;
        if (this.refreshAgain) { this.refreshAgain = false; this.refresh(); }
      }
    },
    async invite(email = '', memberId = null, role = 'adult') {
      const { data, error } = await this.client.rpc('homa_invite_person', {
        p_email: String(email || '').trim().toLowerCase(),
        p_member_id: memberId || null,
        p_role: role === 'child' || role === 'member' ? 'child' : 'adult'
      });
      if (error) throw new Error(explain(error));
      if (data && typeof data === 'object') return data;
      return { code: String(data || ''), email: String(email || ''), role: role === 'child' || role === 'member' ? 'child' : 'adult', memberId: memberId || null };
    },
    async myLink() {
      const { data, error } = await this.client.rpc('homa_my_link');
      if (error) throw new Error(explain(error));
      const row = data && typeof data === 'object' ? data : {};
      return {
        role: row.role || null,
        linkedMemberId: row.linkedMemberId || row.linked_member_id || null,
        isOwner: !!(row.isOwner ?? row.is_owner)
      };
    },
    listen() {
      if (!this.client || !this.householdId || this.channel) return;
      this.channel = this.client.channel('homa-' + this.householdId)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'homa_entities', filter: 'household_id=eq.' + this.householdId }, () => this.refresh())
        .subscribe();
    },
    refresh() {
      if (this.saving) { this.refreshAgain = true; return; }
      clearTimeout(this.refreshTimer);
      this.refreshTimer = setTimeout(async () => {
        if (this.saving) { this.refreshAgain = true; return; }
        try {
          const rows = await this.pull();
          const state = assemble(rows);
          globalThis.HomaApplyCloudState?.(state);
        } catch (error) {
          if (globalThis.toast) globalThis.toast(explain(error), true);
        }
      }, 400);
    }
  };
  return transport;
});
