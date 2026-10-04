-- La Homa household sync. Run once in the Supabase SQL editor.
-- Authenticated adults read through RLS and write only through these functions.
-- Do not grant write access on the tables to the browser role.

begin;

create table if not exists public.homa_households (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 120),
  timezone text not null default 'Europe/Madrid',
  revision bigint not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.homa_memberships (
  household_id uuid references public.homa_households(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'adult')),
  joined_at timestamptz not null default now(),
  revoked_at timestamptz,
  primary key (household_id, user_id)
);

create or replace function public.homa_can_read(h uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.homa_memberships m
    where m.household_id = h and m.user_id = auth.uid() and m.revoked_at is null
  )
$$;

revoke all on function public.homa_can_read(uuid) from public;
grant execute on function public.homa_can_read(uuid) to authenticated;

create table if not exists public.homa_entities (
  household_id uuid references public.homa_households(id) on delete cascade,
  kind text not null check (kind ~ '^[a-zA-Z.]+$'),
  entity_id text not null,
  data jsonb not null check (pg_column_size(data) < 2000000),
  revision bigint not null default 1,
  updated_at timestamptz not null default now(),
  primary key (household_id, kind, entity_id)
);

create table if not exists public.homa_receipts (
  household_id uuid references public.homa_households(id) on delete cascade,
  operation_id text not null,
  user_id uuid,
  revision bigint not null,
  result jsonb not null,
  created_at timestamptz not null default now(),
  primary key (household_id, operation_id)
);

create table if not exists public.homa_invitations (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.homa_households(id) on delete cascade,
  token_hash text unique not null,
  email text not null,
  invited_by uuid not null references auth.users(id),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  revoked_at timestamptz
);

create table if not exists public.homa_devices (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.homa_households(id) on delete cascade,
  token_hash text unique not null,
  name text not null,
  allowed_members text[] not null default '{}',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz
);

create table if not exists public.homa_files (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.homa_households(id) on delete cascade,
  entity_kind text not null,
  entity_id text not null,
  storage_path text unique not null,
  mime text not null check (mime in ('application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'text/plain')),
  bytes integer not null check (bytes > 0 and bytes <= 5242880),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  review_after date,
  deleted_at timestamptz
);

alter table public.homa_households enable row level security;
alter table public.homa_memberships enable row level security;
alter table public.homa_entities enable row level security;
alter table public.homa_receipts enable row level security;
alter table public.homa_invitations enable row level security;
alter table public.homa_devices enable row level security;
alter table public.homa_files enable row level security;

drop policy if exists homa_households_read on public.homa_households;
drop policy if exists homa_memberships_read on public.homa_memberships;
drop policy if exists homa_entities_read on public.homa_entities;
drop policy if exists homa_files_read on public.homa_files;
create policy homa_households_read on public.homa_households for select to authenticated using (public.homa_can_read(id));
create policy homa_memberships_read on public.homa_memberships for select to authenticated using (public.homa_can_read(household_id));
create policy homa_entities_read on public.homa_entities for select to authenticated using (public.homa_can_read(household_id));
create policy homa_files_read on public.homa_files for select to authenticated using (public.homa_can_read(household_id));

revoke all on public.homa_households, public.homa_memberships, public.homa_entities, public.homa_receipts, public.homa_invitations, public.homa_devices, public.homa_files from anon, authenticated;
grant select on public.homa_households, public.homa_memberships, public.homa_entities, public.homa_files to authenticated;

create or replace function public.homa_household_id()
returns uuid
language sql stable security definer set search_path = public as $$
  select m.household_id from public.homa_memberships m
  where m.user_id = auth.uid() and m.revoked_at is null
  order by m.joined_at
  limit 1
$$;

create or replace function public.homa_bootstrap(p_name text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  hid uuid;
  label text;
begin
  if uid is null then raise exception 'FORBIDDEN'; end if;
  hid := public.homa_household_id();
  if hid is not null then return hid; end if;
  label := left(coalesce(nullif(btrim(p_name), ''), 'Mi hogar'), 120);
  insert into public.homa_households(name) values (label) returning id into hid;
  insert into public.homa_memberships(household_id, user_id, role) values (hid, uid, 'owner');
  return hid;
end;
$$;

create or replace function public.homa_pull()
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  hid uuid := public.homa_household_id();
begin
  if auth.uid() is null then raise exception 'FORBIDDEN'; end if;
  if hid is null then return '[]'::jsonb; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'kind', e.kind, 'id', e.entity_id, 'data', e.data, 'revision', e.revision
    ) order by e.kind, e.entity_id)
    from public.homa_entities e where e.household_id = hid
  ), '[]'::jsonb);
end;
$$;

create or replace function public.homa_push(changes jsonb)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  hid uuid;
  item jsonb;
  kind text;
  eid text;
  expected bigint;
  payload jsonb;
  current public.homa_entities%rowtype;
  applied jsonb := '[]'::jsonb;
begin
  if uid is null then raise exception 'FORBIDDEN'; end if;
  if jsonb_typeof(changes) <> 'array' or jsonb_array_length(changes) > 200 then raise exception 'INVALID_COMMAND'; end if;
  hid := public.homa_household_id();
  if hid is null then raise exception 'FORBIDDEN'; end if;
  if not exists (
    select 1 from public.homa_memberships m
    where m.household_id = hid and m.user_id = uid and m.revoked_at is null and m.role in ('owner', 'adult')
  ) then raise exception 'FORBIDDEN'; end if;
  perform 1 from public.homa_households h where h.id = hid for update;

  for item in select value from jsonb_array_elements(changes) loop
    kind := item->>'kind';
    eid := item->>'id';
    expected := coalesce((item->>'expectedRevision')::bigint, 0);
    payload := item->'after';
    if kind is null or eid is null or kind !~ '^[a-zA-Z.]+$' or eid !~ '^[A-Za-z0-9_.:@-]{1,200}$' or expected < 0 then
      raise exception 'INVALID_COMMAND';
    end if;
    select * into current from public.homa_entities e
      where e.household_id = hid and e.kind = kind and e.entity_id = eid
      for update;
    if payload is null or jsonb_typeof(payload) = 'null' then
      if not found then
        applied := applied || jsonb_build_array(jsonb_build_object('kind', kind, 'id', eid, 'revision', null));
      elsif current.revision <> expected then
        raise exception 'VERSION_CONFLICT';
      else
        delete from public.homa_entities e where e.household_id = hid and e.kind = kind and e.entity_id = eid;
        applied := applied || jsonb_build_array(jsonb_build_object('kind', kind, 'id', eid, 'revision', null));
      end if;
    else
      if octet_length(payload::text) >= 1900000 then raise exception 'INVALID_COMMAND'; end if;
      if not found then
        if expected <> 0 then raise exception 'VERSION_CONFLICT'; end if;
        insert into public.homa_entities(household_id, kind, entity_id, data, revision)
          values (hid, kind, eid, payload, 1);
        applied := applied || jsonb_build_array(jsonb_build_object('kind', kind, 'id', eid, 'revision', 1));
      elsif current.revision = expected then
        update public.homa_entities e
          set data = payload, revision = current.revision + 1, updated_at = now()
          where e.household_id = hid and e.kind = kind and e.entity_id = eid;
        applied := applied || jsonb_build_array(jsonb_build_object('kind', kind, 'id', eid, 'revision', current.revision + 1));
      elsif current.data = payload then
        applied := applied || jsonb_build_array(jsonb_build_object('kind', kind, 'id', eid, 'revision', current.revision));
      else
        raise exception 'VERSION_CONFLICT';
      end if;
    end if;
  end loop;

  update public.homa_households set revision = revision + 1 where id = hid;
  return applied;
end;
$$;

create or replace function public.homa_invite()
returns text
language plpgsql security definer set search_path = public, extensions as $$
declare
  uid uuid := auth.uid();
  hid uuid;
  code text;
begin
  if uid is null then raise exception 'FORBIDDEN'; end if;
  hid := public.homa_household_id();
  if hid is null then raise exception 'FORBIDDEN'; end if;
  if not exists (
    select 1 from public.homa_memberships m
    where m.household_id = hid and m.user_id = uid and m.revoked_at is null and m.role in ('owner', 'adult')
  ) then raise exception 'FORBIDDEN'; end if;
  code := encode(extensions.gen_random_bytes(5), 'hex');
  insert into public.homa_invitations(household_id, token_hash, email, invited_by, expires_at)
    values (hid, encode(extensions.digest(code, 'sha256'), 'hex'), '', uid, now() + interval '7 days');
  return code;
end;
$$;

create or replace function public.homa_accept(p_code text)
returns uuid
language plpgsql security definer set search_path = public, extensions as $$
declare
  uid uuid := auth.uid();
  hid uuid;
  invite public.homa_invitations%rowtype;
  normalized text := lower(btrim(coalesce(p_code, '')));
begin
  if uid is null or normalized !~ '^[a-f0-9]{10}$' then raise exception 'INVITE_INVALID'; end if;
  if public.homa_household_id() is not null then raise exception 'ALREADY_IN_HOUSEHOLD'; end if;
  select * into invite from public.homa_invitations i
    where i.token_hash = encode(extensions.digest(normalized, 'sha256'), 'hex')
      and i.accepted_at is null and i.revoked_at is null and i.expires_at > now()
    for update;
  if not found then raise exception 'INVITE_INVALID'; end if;
  hid := invite.household_id;
  insert into public.homa_memberships(household_id, user_id, role) values (hid, uid, 'adult');
  update public.homa_invitations set accepted_at = now() where id = invite.id;
  return hid;
end;
$$;

revoke all on function public.homa_household_id() from public, anon;
revoke all on function public.homa_bootstrap(text) from public, anon;
revoke all on function public.homa_pull() from public, anon;
revoke all on function public.homa_push(jsonb) from public, anon;
revoke all on function public.homa_invite() from public, anon;
revoke all on function public.homa_accept(text) from public, anon;
grant execute on function public.homa_household_id() to authenticated;
grant execute on function public.homa_bootstrap(text) to authenticated;
grant execute on function public.homa_pull() to authenticated;
grant execute on function public.homa_push(jsonb) to authenticated;
grant execute on function public.homa_invite() to authenticated;
grant execute on function public.homa_accept(text) to authenticated;

alter table public.homa_entities replica identity full;
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'homa_entities'
  ) then
    alter publication supabase_realtime add table public.homa_entities;
  end if;
end $$;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('homa-private', 'homa-private', false, 5242880, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'text/plain'])
on conflict (id) do nothing;

commit;
