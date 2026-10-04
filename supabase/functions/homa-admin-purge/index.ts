// Borra del almacenamiento privado los archivos de las casas eliminadas desde el panel.
// Solo lo puede pedir una cuenta operadora con la verificación en dos pasos hecha.
// Las rutas salen de homa_storage_trash, nunca del navegador.
import { createClient } from 'npm:@supabase/supabase-js@2';

const ORIGINS = ['https://admin.lahoma.app'];

function headers(origin: string) {
  const allowed = ORIGINS.includes(origin);
  return {
    ...(allowed ? { 'Access-Control-Allow-Origin': origin } : {}),
    'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
    Vary: 'Origin'
  };
}

Deno.serve(async req => {
  const origin = req.headers.get('Origin') ?? '';
  const cors = headers(origin);
  const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: cors });
  if (req.method === 'OPTIONS') {
    if (!ORIGINS.includes(origin)) return new Response(null, { status: 403 });
    return new Response(null, { status: 204, headers: cors });
  }
  if (req.method !== 'POST') return reply({ error: 'METHOD_NOT_ALLOWED' }, 405);
  if (origin && !ORIGINS.includes(origin)) return reply({ error: 'FORBIDDEN' }, 403);

  const authorization = req.headers.get('Authorization') ?? '';
  if (!authorization.startsWith('Bearer ')) return reply({ error: 'UNAUTHORIZED' }, 401);

  const url = Deno.env.get('SUPABASE_URL')!;
  const asUser = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const role = await asUser.rpc('homa_operator_session');
  if (role.error || role.data !== true) return reply({ error: 'FORBIDDEN' }, 403);

  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const trash = await admin.from('homa_storage_trash').select('storage_path').limit(500);
  if (trash.error) return reply({ error: 'TRASH_UNREADABLE' }, 500);
  const paths = (trash.data ?? []).map(row => row.storage_path as string);
  if (!paths.length) return reply({ removed: 0 });

  const removed = await admin.storage.from('homa-private').remove(paths);
  if (removed.error) return reply({ error: 'STORAGE_FAILED' }, 502);
  const cleared = await admin.from('homa_storage_trash').delete().in('storage_path', paths);
  if (cleared.error) return reply({ error: 'TRASH_NOT_CLEARED', removed: paths.length }, 500);
  return reply({ removed: paths.length });
});
