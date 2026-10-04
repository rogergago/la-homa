-- Panel de operador de La Homa: ficha de contacto, acciones sobre casas y cuentas, y registro.
-- Todo pasa por funciones que comprueban homa_is_operator(). Las tablas nuevas no se abren al navegador.
-- El panel ve a las cuentas adultas y cuántas cosas usa cada casa, nunca el contenido:
-- ni nombres de niños, ni dinero, ni convivencia, ni fotos.

begin;

create table if not exists public.homa_household_contacts (
  household_id uuid primary key references public.homa_households(id) on delete cascade,
  first_name text not null default '' check (char_length(first_name) <= 80),
  last_name text not null default '' check (char_length(last_name) <= 120),
  phone text not null default '' check (char_length(phone) <= 40),
  email text not null default '' check (char_length(email) <= 254),
  notes text not null default '' check (char_length(notes) <= 4000),
  tags text[] not null default '{}' check (cardinality(tags) <= 12),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

create table if not exists public.homa_operator_log (
  id bigint generated always as identity primary key,
  operator_id uuid references auth.users(id) on delete set null,
  operator_email text not null default '',
  action text not null,
  target_type text not null,
  target_id text not null default '',
  target_label text not null default '',
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.homa_storage_trash (
  storage_path text primary key,
  created_at timestamptz not null default now()
);

alter table public.homa_household_contacts enable row level security;
alter table public.homa_operator_log enable row level security;
alter table public.homa_storage_trash enable row level security;
revoke all on public.homa_household_contacts, public.homa_operator_log, public.homa_storage_trash from public, anon, authenticated;

create or replace function public.homa_admin_guard()
returns uuid
language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null or not public.homa_is_operator() then
    raise exception 'FORBIDDEN';
  end if;
  return auth.uid();
end;
$$;

create or replace function public.homa_admin_note(p_action text, p_type text, p_id text, p_label text, p_detail jsonb)
returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into public.homa_operator_log(operator_id, operator_email, action, target_type, target_id, target_label, detail)
  select auth.uid(), coalesce((select u.email from auth.users u where u.id = auth.uid()), ''),
         p_action, p_type, coalesce(p_id, ''), left(coalesce(p_label, ''), 200), coalesce(p_detail, '{}'::jsonb);
end;
$$;

create or replace function public.homa_admin_person_name(meta jsonb)
returns text
language sql immutable set search_path = public as $$
  select btrim(coalesce(nullif(meta->>'full_name', ''), nullif(meta->>'name', ''), ''))
$$;

create or replace function public.homa_admin_household_card(h public.homa_households)
returns jsonb
language sql stable security definer set search_path = public as $$
  with holder as (
    select u.id, u.email, u.phone, u.created_at, u.last_sign_in_at,
           public.homa_admin_person_name(u.raw_user_meta_data) as full_name,
           case when coalesce(u.raw_app_meta_data->>'provider', '') = 'google' then 'google' else 'email' end as provider
    from public.homa_memberships m
    join auth.users u on u.id = m.user_id
    where m.household_id = h.id and m.revoked_at is null
    order by (m.role = 'owner') desc, m.joined_at
    limit 1
  ),
  contact as (
    select * from public.homa_household_contacts c where c.household_id = h.id
  ),
  synced as (
    select count(*) as total, max(e.updated_at) as last_update
    from public.homa_entities e where e.household_id = h.id
  ),
  signin as (
    select max(u.last_sign_in_at) as last_sign_in, count(*) as accounts
    from public.homa_memberships m join auth.users u on u.id = m.user_id
    where m.household_id = h.id and m.revoked_at is null
  ),
  people as (
    select count(*) filter (where e.data->>'role' = 'adult') as adults,
           count(*) filter (where e.data->>'role' = 'member') as children,
           count(*) filter (where e.data->>'role' = 'pet') as pets
    from public.homa_entities e
    where e.household_id = h.id and e.kind = 'members'
      and coalesce(e.data->>'active', 'true') <> 'false'
  ),
  activity as (
    select greatest(synced.last_update, signin.last_sign_in) as last_activity from synced, signin
  )
  select jsonb_build_object(
    'id', h.id,
    'name', h.name,
    'createdAt', h.created_at,
    'lastActivity', activity.last_activity,
    'lastSync', synced.last_update,
    'status', case
      when activity.last_activity is null then 'sin_uso'
      when activity.last_activity > now() - interval '7 days' then 'activa'
      when activity.last_activity > now() - interval '30 days' then 'poco_uso'
      else 'dormida'
    end,
    'isNew', h.created_at > now() - interval '7 days',
    'adults', people.adults,
    'children', people.children,
    'pets', people.pets,
    'records', synced.total,
    'accounts', signin.accounts,
    'holder', case when holder.id is null then null else jsonb_build_object(
      'userId', holder.id,
      'accountEmail', holder.email,
      'provider', holder.provider,
      'lastSignIn', holder.last_sign_in_at
    ) end,
    'contact', jsonb_build_object(
      'firstName', coalesce(nullif(contact.first_name, ''), nullif(split_part(holder.full_name, ' ', 1), ''), ''),
      'lastName', coalesce(nullif(contact.last_name, ''),
                           nullif(btrim(substr(holder.full_name, char_length(split_part(holder.full_name, ' ', 1)) + 1)), ''), ''),
      'email', coalesce(nullif(contact.email, ''), holder.email, ''),
      'phone', coalesce(nullif(contact.phone, ''), nullif(holder.phone, ''), ''),
      'notes', coalesce(contact.notes, ''),
      'tags', coalesce(to_jsonb(contact.tags), '[]'::jsonb),
      'updatedAt', contact.updated_at,
      'edited', contact.household_id is not null
    )
  )
  from synced, signin, people, activity
  left join holder on true
  left join contact on true
$$;

create or replace function public.homa_admin_households()
returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.homa_admin_guard();
  return coalesce((
    select jsonb_agg(public.homa_admin_household_card(h) order by h.created_at desc)
    from public.homa_households h
  ), '[]'::jsonb);
end;
$$;

create or replace function public.homa_admin_household(p_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  h public.homa_households;
begin
  perform public.homa_admin_guard();
  select * into h from public.homa_households where id = p_id;
  if not found then raise exception 'NOT_FOUND'; end if;
  return public.homa_admin_household_card(h) || jsonb_build_object(
    'timezone', h.timezone,
    'revision', h.revision,
    'accountList', coalesce((
      select jsonb_agg(jsonb_build_object(
        'userId', u.id,
        'email', u.email,
        'name', public.homa_admin_person_name(u.raw_user_meta_data),
        'provider', case when coalesce(u.raw_app_meta_data->>'provider', '') = 'google' then 'google' else 'email' end,
        'role', m.role,
        'joinedAt', m.joined_at,
        'revokedAt', m.revoked_at,
        'lastSignIn', u.last_sign_in_at,
        'confirmed', u.email_confirmed_at is not null,
        'isOperator', exists (select 1 from public.homa_operators o where o.user_id = u.id)
      ) order by m.joined_at)
      from public.homa_memberships m join auth.users u on u.id = m.user_id
      where m.household_id = h.id
    ), '[]'::jsonb),
    'invitations', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', i.id,
        'invitedBy', coalesce(u.email, ''),
        'expiresAt', i.expires_at,
        'acceptedAt', i.accepted_at,
        'revokedAt', i.revoked_at
      ) order by i.expires_at desc)
      from public.homa_invitations i left join auth.users u on u.id = i.invited_by
      where i.household_id = h.id
    ), '[]'::jsonb),
    'devices', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', d.id, 'name', d.name, 'createdAt', d.created_at, 'expiresAt', d.expires_at, 'revokedAt', d.revoked_at
      ) order by d.created_at desc)
      from public.homa_devices d where d.household_id = h.id
    ), '[]'::jsonb),
    'usage', coalesce((
      select jsonb_object_agg(kind, n)
      from (
        select e.kind, count(*) as n
        from public.homa_entities e
        where e.household_id = h.id
          and e.kind in ('tasks', 'weeks', 'events', 'preparations', 'recipes', 'mealPlan', 'shopping', 'pantry', 'routines', 'rewards', 'vouchers', 'templates', 'swaps')
        group by e.kind
      ) counted
    ), '{}'::jsonb),
    'usesAllowance', exists (select 1 from public.homa_entities e where e.household_id = h.id and e.kind like 'finance.%'),
    'usesCustody', exists (select 1 from public.homa_entities e where e.household_id = h.id and e.kind in ('presencePlans', 'presenceOverrides')),
    'files', (
      select jsonb_build_object('count', count(*), 'bytes', coalesce(sum(f.bytes), 0))
      from public.homa_files f where f.household_id = h.id and f.deleted_at is null
    ),
    'syncOperations', (select count(*) from public.homa_receipts r where r.household_id = h.id),
    'log', coalesce((
      select jsonb_agg(row_to_json(l)::jsonb order by l.created_at desc)
      from (
        select id, operator_email as "operatorEmail", action, detail, created_at as "createdAt"
        from public.homa_operator_log
        where target_type = 'household' and target_id = h.id::text
        order by created_at desc
        limit 30
      ) l
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.homa_admin_update_household(p_id uuid, p_patch jsonb)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := public.homa_admin_guard();
  h public.homa_households;
  c jsonb;
  v_name text;
  v_tz text;
  v_email text;
  v_tags text[];
  changed text[] := '{}';
begin
  if p_patch is null or jsonb_typeof(p_patch) <> 'object' then raise exception 'INVALID_COMMAND'; end if;
  select * into h from public.homa_households where id = p_id for update;
  if not found then raise exception 'NOT_FOUND'; end if;

  if p_patch ? 'name' then
    v_name := btrim(coalesce(p_patch->>'name', ''));
    if char_length(v_name) not between 1 and 120 then raise exception 'INVALID_NAME'; end if;
    if v_name <> h.name then
      update public.homa_households set name = v_name where id = p_id;
      changed := array_append(changed, 'name');
    end if;
  end if;

  if p_patch ? 'timezone' then
    v_tz := coalesce(p_patch->>'timezone', '');
    if not exists (select 1 from pg_timezone_names where name = v_tz) then raise exception 'INVALID_TIMEZONE'; end if;
    if v_tz <> h.timezone then
      update public.homa_households set timezone = v_tz where id = p_id;
      changed := array_append(changed, 'timezone');
    end if;
  end if;

  if p_patch ? 'contact' then
    c := p_patch->'contact';
    if jsonb_typeof(c) <> 'object' then raise exception 'INVALID_COMMAND'; end if;
    v_email := lower(btrim(coalesce(c->>'email', '')));
    if v_email <> '' and v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'INVALID_EMAIL'; end if;
    select coalesce(array_agg(distinct left(btrim(t), 30)) filter (where btrim(t) <> ''), '{}')
      into v_tags
      from jsonb_array_elements_text(case when jsonb_typeof(c->'tags') = 'array' then c->'tags' else '[]'::jsonb end) t;
    v_tags := v_tags[1:12];
    insert into public.homa_household_contacts as hc (household_id, first_name, last_name, phone, email, notes, tags, updated_at, updated_by)
    values (
      p_id,
      left(btrim(coalesce(c->>'firstName', '')), 80),
      left(btrim(coalesce(c->>'lastName', '')), 120),
      left(btrim(coalesce(c->>'phone', '')), 40),
      left(v_email, 254),
      left(coalesce(c->>'notes', ''), 4000),
      coalesce(v_tags, '{}'),
      now(),
      uid
    )
    on conflict (household_id) do update set
      first_name = excluded.first_name,
      last_name = excluded.last_name,
      phone = excluded.phone,
      email = excluded.email,
      notes = excluded.notes,
      tags = excluded.tags,
      updated_at = now(),
      updated_by = uid;
    changed := array_append(changed, 'contact');
  end if;

  if cardinality(changed) > 0 then
    perform public.homa_admin_note('update', 'household', p_id::text, coalesce(v_name, h.name), jsonb_build_object('fields', to_jsonb(changed)));
  end if;
  return public.homa_admin_household(p_id);
end;
$$;

create or replace function public.homa_admin_set_access(p_household uuid, p_user uuid, p_active boolean)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  label text;
  account text;
begin
  perform public.homa_admin_guard();
  update public.homa_memberships
    set revoked_at = case when p_active then null else now() end
    where household_id = p_household and user_id = p_user;
  if not found then raise exception 'NOT_FOUND'; end if;
  select name into label from public.homa_households where id = p_household;
  select email into account from auth.users where id = p_user;
  perform public.homa_admin_note(case when p_active then 'restore_access' else 'revoke_access' end,
    'household', p_household::text, label, jsonb_build_object('account', coalesce(account, '')));
  return public.homa_admin_household(p_household);
end;
$$;

create or replace function public.homa_admin_revoke_invitation(p_id uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  hid uuid;
  label text;
begin
  perform public.homa_admin_guard();
  update public.homa_invitations set revoked_at = now()
    where id = p_id and accepted_at is null and revoked_at is null
    returning household_id into hid;
  if hid is null then raise exception 'NOT_FOUND'; end if;
  select name into label from public.homa_households where id = hid;
  perform public.homa_admin_note('revoke_invitation', 'household', hid::text, label, '{}'::jsonb);
  return public.homa_admin_household(hid);
end;
$$;

create or replace function public.homa_admin_revoke_device(p_id uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  hid uuid;
  label text;
  device text;
begin
  perform public.homa_admin_guard();
  update public.homa_devices set revoked_at = now()
    where id = p_id and revoked_at is null
    returning household_id, name into hid, device;
  if hid is null then raise exception 'NOT_FOUND'; end if;
  select name into label from public.homa_households where id = hid;
  perform public.homa_admin_note('revoke_device', 'household', hid::text, label, jsonb_build_object('device', device));
  return public.homa_admin_household(hid);
end;
$$;

create or replace function public.homa_admin_delete_household(p_id uuid, p_confirm text, p_delete_accounts boolean default false)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := public.homa_admin_guard();
  h public.homa_households;
  doomed uuid[] := '{}';
  file_count integer;
begin
  select * into h from public.homa_households where id = p_id for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if btrim(coalesce(p_confirm, '')) <> h.name then raise exception 'CONFIRM_MISMATCH'; end if;

  insert into public.homa_storage_trash(storage_path)
    select f.storage_path from public.homa_files f where f.household_id = p_id
    on conflict do nothing;
  get diagnostics file_count = row_count;

  if coalesce(p_delete_accounts, false) then
    select coalesce(array_agg(m.user_id), '{}') into doomed
    from public.homa_memberships m
    where m.household_id = p_id
      and m.user_id <> uid
      and not exists (select 1 from public.homa_operators o where o.user_id = m.user_id)
      and not exists (
        select 1 from public.homa_memberships other
        where other.user_id = m.user_id and other.household_id <> p_id and other.revoked_at is null
      );
  end if;

  perform public.homa_admin_note('delete', 'household', p_id::text, h.name,
    jsonb_build_object('accountsDeleted', cardinality(doomed), 'files', file_count));
  delete from public.homa_households where id = p_id;

  if cardinality(doomed) > 0 then
    update public.homa_files set created_by = null where created_by = any(doomed);
    delete from public.homa_invitations where invited_by = any(doomed);
    delete from auth.users where id = any(doomed);
  end if;

  return jsonb_build_object('accountsDeleted', cardinality(doomed), 'filesQueued', file_count);
end;
$$;

create or replace function public.homa_admin_accounts()
returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.homa_admin_guard();
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'userId', u.id,
      'email', u.email,
      'name', public.homa_admin_person_name(u.raw_user_meta_data),
      'provider', case when coalesce(u.raw_app_meta_data->>'provider', '') = 'google' then 'google' else 'email' end,
      'createdAt', u.created_at,
      'lastSignIn', u.last_sign_in_at,
      'confirmed', u.email_confirmed_at is not null,
      'isOperator', exists (select 1 from public.homa_operators o where o.user_id = u.id),
      'householdId', m.household_id,
      'householdName', hh.name,
      'role', m.role
    ) order by u.created_at desc)
    from auth.users u
    left join lateral (
      select mm.household_id, mm.role from public.homa_memberships mm
      where mm.user_id = u.id and mm.revoked_at is null
      order by mm.joined_at limit 1
    ) m on true
    left join public.homa_households hh on hh.id = m.household_id
  ), '[]'::jsonb);
end;
$$;

create or replace function public.homa_admin_delete_account(p_user uuid, p_confirm text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := public.homa_admin_guard();
  v_email text;
begin
  if p_user = uid then raise exception 'CANNOT_DELETE_SELF'; end if;
  if exists (select 1 from public.homa_operators o where o.user_id = p_user) then raise exception 'CANNOT_DELETE_OPERATOR'; end if;
  select email into v_email from auth.users where id = p_user;
  if not found then raise exception 'NOT_FOUND'; end if;
  if lower(btrim(coalesce(p_confirm, ''))) <> lower(coalesce(v_email, '')) then raise exception 'CONFIRM_MISMATCH'; end if;
  perform public.homa_admin_note('delete', 'account', p_user::text, v_email, '{}'::jsonb);
  update public.homa_files set created_by = null where created_by = p_user;
  delete from public.homa_invitations where invited_by = p_user;
  delete from auth.users where id = p_user;
  return jsonb_build_object('deleted', true);
end;
$$;

create or replace function public.homa_admin_dashboard()
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  result jsonb;
begin
  perform public.homa_admin_guard();
  with cards as (
    select public.homa_admin_household_card(h) as c from public.homa_households h
  ),
  weeks as (
    select generate_series(date_trunc('week', now()) - interval '11 weeks', date_trunc('week', now()), interval '1 week') as start
  )
  select jsonb_build_object(
    'totals', jsonb_build_object(
      'households', (select count(*) from public.homa_households),
      'active7', (select count(*) from cards where c->>'status' = 'activa'),
      'active30', (select count(*) from cards where c->>'status' in ('activa', 'poco_uso')),
      'dormant', (select count(*) from cards where c->>'status' in ('dormida', 'sin_uso')),
      'accounts', (select count(*) from auth.users),
      'unconfirmed', (select count(*) from auth.users where email_confirmed_at is null),
      'withoutHome', (
        select count(*) from auth.users u
        where not exists (select 1 from public.homa_memberships m where m.user_id = u.id and m.revoked_at is null)
          and not exists (select 1 from public.homa_operators o where o.user_id = u.id)
      ),
      'signups7', (select count(*) from auth.users where created_at > now() - interval '7 days'),
      'signups30', (select count(*) from auth.users where created_at > now() - interval '30 days'),
      'households30', (select count(*) from public.homa_households where created_at > now() - interval '30 days'),
      'google', (select count(*) from auth.users where raw_app_meta_data->>'provider' = 'google'),
      'pendingInvitations', (select count(*) from public.homa_invitations where accepted_at is null and revoked_at is null and expires_at > now()),
      'postsPublished', (select count(*) from public.site_posts where status = 'published'),
      'postsDraft', (select count(*) from public.site_posts where status = 'draft')
    ),
    'weekly', (
      select jsonb_agg(jsonb_build_object(
        'week', w.start,
        'accounts', (select count(*) from auth.users u where u.created_at >= w.start and u.created_at < w.start + interval '1 week'),
        'households', (select count(*) from public.homa_households h where h.created_at >= w.start and h.created_at < w.start + interval '1 week')
      ) order by w.start)
      from weeks w
    ),
    'funnel', jsonb_build_object(
      'accounts', (select count(*) from auth.users u where not exists (select 1 from public.homa_operators o where o.user_id = u.id)),
      'withHome', (select count(distinct m.user_id) from public.homa_memberships m where m.revoked_at is null
                    and not exists (select 1 from public.homa_operators o where o.user_id = m.user_id)),
      'withData', (select count(*) from cards where (c->>'records')::int > 0),
      'active7', (select count(*) from cards where (c->>'records')::int > 0 and c->>'status' = 'activa')
    ),
    'adoption', jsonb_build_object(
      'tasks', (select count(distinct household_id) from public.homa_entities where kind = 'tasks'),
      'calendar', (select count(distinct household_id) from public.homa_entities where kind = 'events'),
      'kitchen', (select count(distinct household_id) from public.homa_entities where kind in ('recipes', 'mealPlan', 'shopping')),
      'allowance', (select count(distinct household_id) from public.homa_entities where kind like 'finance.%'),
      'routines', (select count(distinct household_id) from public.homa_entities where kind = 'routines'),
      'custody', (select count(distinct household_id) from public.homa_entities where kind in ('presencePlans', 'presenceOverrides')),
      'secondAdult', (select count(*) from (select household_id from public.homa_memberships where revoked_at is null group by household_id having count(*) > 1) two)
    ),
    'leads', coalesce((
      select jsonb_agg(row_to_json(l)::jsonb)
      from (
        select u.id as "userId", u.email, public.homa_admin_person_name(u.raw_user_meta_data) as name,
               u.created_at as "createdAt", u.email_confirmed_at is not null as confirmed
        from auth.users u
        where not exists (select 1 from public.homa_memberships m where m.user_id = u.id and m.revoked_at is null)
          and not exists (select 1 from public.homa_operators o where o.user_id = u.id)
        order by u.created_at desc
        limit 20
      ) l
    ), '[]'::jsonb),
    'dormant', coalesce((
      select jsonb_agg(c order by c->>'lastActivity' nulls first)
      from (select c from cards where c->>'status' in ('dormida', 'sin_uso') limit 20) d
    ), '[]'::jsonb),
    'recent', coalesce((
      select jsonb_agg(c order by c->>'createdAt' desc)
      from (select c from cards order by c->>'createdAt' desc limit 8) r
    ), '[]'::jsonb),
    'log', coalesce((
      select jsonb_agg(row_to_json(l)::jsonb order by l."createdAt" desc)
      from (
        select id, operator_email as "operatorEmail", action, target_type as "targetType", target_label as "targetLabel",
               detail, created_at as "createdAt"
        from public.homa_operator_log order by created_at desc limit 12
      ) l
    ), '[]'::jsonb)
  ) into result;
  return result;
end;
$$;

create or replace function public.homa_admin_log(p_limit integer default 300)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.homa_admin_guard();
  return coalesce((
    select jsonb_agg(row_to_json(l)::jsonb order by l."createdAt" desc)
    from (
      select id, operator_email as "operatorEmail", action, target_type as "targetType", target_id as "targetId",
             target_label as "targetLabel", detail, created_at as "createdAt"
      from public.homa_operator_log
      order by created_at desc
      limit least(greatest(coalesce(p_limit, 300), 1), 1000)
    ) l
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.homa_admin_guard() from public, anon, authenticated;
revoke all on function public.homa_admin_note(text, text, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.homa_admin_person_name(jsonb) from public, anon, authenticated;
revoke all on function public.homa_admin_household_card(public.homa_households) from public, anon, authenticated;

revoke all on function public.homa_admin_households() from public, anon;
revoke all on function public.homa_admin_household(uuid) from public, anon;
revoke all on function public.homa_admin_update_household(uuid, jsonb) from public, anon;
revoke all on function public.homa_admin_set_access(uuid, uuid, boolean) from public, anon;
revoke all on function public.homa_admin_revoke_invitation(uuid) from public, anon;
revoke all on function public.homa_admin_revoke_device(uuid) from public, anon;
revoke all on function public.homa_admin_delete_household(uuid, text, boolean) from public, anon;
revoke all on function public.homa_admin_accounts() from public, anon;
revoke all on function public.homa_admin_delete_account(uuid, text) from public, anon;
revoke all on function public.homa_admin_dashboard() from public, anon;
revoke all on function public.homa_admin_log(integer) from public, anon;

grant execute on function public.homa_admin_households() to authenticated;
grant execute on function public.homa_admin_household(uuid) to authenticated;
grant execute on function public.homa_admin_update_household(uuid, jsonb) to authenticated;
grant execute on function public.homa_admin_set_access(uuid, uuid, boolean) to authenticated;
grant execute on function public.homa_admin_revoke_invitation(uuid) to authenticated;
grant execute on function public.homa_admin_revoke_device(uuid) to authenticated;
grant execute on function public.homa_admin_delete_household(uuid, text, boolean) to authenticated;
grant execute on function public.homa_admin_accounts() to authenticated;
grant execute on function public.homa_admin_delete_account(uuid, text) to authenticated;
grant execute on function public.homa_admin_dashboard() to authenticated;
grant execute on function public.homa_admin_log(integer) to authenticated;

commit;
