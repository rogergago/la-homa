-- LA HOMA / candidate schema. Apply to a TEST project first.
-- No direct client write grants: the command API must authenticate, validate
-- and commit operations. Not a replacement for a completed HTTP adapter.
begin;
create table public.homa_households (
 id uuid primary key default gen_random_uuid(), name text not null check(length(name) between 1 and 120),
 timezone text not null default 'Europe/Madrid', revision bigint not null default 0,
 created_at timestamptz not null default now()
);
create table public.homa_memberships (
 household_id uuid references public.homa_households(id) on delete cascade,
 user_id uuid references auth.users(id) on delete cascade,
 role text not null check(role in ('owner','adult')),
 joined_at timestamptz not null default now(), revoked_at timestamptz,
 primary key(household_id,user_id)
);
create or replace function public.homa_can_read(h uuid) returns boolean
 language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.homa_memberships m where m.household_id=h and m.user_id=auth.uid() and m.revoked_at is null)
$$;
revoke all on function public.homa_can_read(uuid) from public;
grant execute on function public.homa_can_read(uuid) to authenticated;
create table public.homa_entities (
 household_id uuid references public.homa_households(id) on delete cascade,
 kind text not null check(kind ~ '^[a-zA-Z.]+$'), entity_id text not null,
 data jsonb not null check(pg_column_size(data) < 2000000), revision bigint not null default 1,
 updated_at timestamptz not null default now(), primary key(household_id,kind,entity_id)
);
create table public.homa_receipts (
 household_id uuid references public.homa_households(id) on delete cascade,
 operation_id text not null, user_id uuid, revision bigint not null,
 result jsonb not null, created_at timestamptz not null default now(),
 primary key(household_id,operation_id)
);
create table public.homa_invitations (
 id uuid primary key default gen_random_uuid(), household_id uuid not null references public.homa_households(id) on delete cascade,
 token_hash text unique not null, email text not null, invited_by uuid not null references auth.users(id),
 expires_at timestamptz not null, accepted_at timestamptz, revoked_at timestamptz
);
create table public.homa_devices (
 id uuid primary key default gen_random_uuid(), household_id uuid not null references public.homa_households(id) on delete cascade,
 token_hash text unique not null, name text not null, allowed_members text[] not null default '{}',
 created_at timestamptz not null default now(), expires_at timestamptz not null, revoked_at timestamptz
);
create table public.homa_files (
 id uuid primary key default gen_random_uuid(), household_id uuid not null references public.homa_households(id) on delete cascade,
 entity_kind text not null, entity_id text not null, storage_path text unique not null,
 mime text not null check(mime in ('application/pdf','image/jpeg','image/png','image/webp','text/plain')),
 bytes integer not null check(bytes > 0 and bytes <= 5242880),
 created_by uuid references auth.users(id), created_at timestamptz not null default now(),
 review_after date, deleted_at timestamptz
);
alter table public.homa_households enable row level security;
alter table public.homa_memberships enable row level security;
alter table public.homa_entities enable row level security;
alter table public.homa_receipts enable row level security;
alter table public.homa_invitations enable row level security;
alter table public.homa_devices enable row level security;
alter table public.homa_files enable row level security;
create policy homa_households_read on public.homa_households for select to authenticated using(public.homa_can_read(id));
create policy homa_memberships_read on public.homa_memberships for select to authenticated using(public.homa_can_read(household_id));
create policy homa_entities_read on public.homa_entities for select to authenticated using(public.homa_can_read(household_id));
create policy homa_files_read on public.homa_files for select to authenticated using(public.homa_can_read(household_id));
revoke all on public.homa_households,public.homa_memberships,public.homa_entities,public.homa_receipts,public.homa_invitations,public.homa_devices,public.homa_files from anon,authenticated;
grant select on public.homa_households,public.homa_memberships,public.homa_entities,public.homa_files to authenticated;
grant all on public.homa_households,public.homa_memberships,public.homa_entities,public.homa_receipts,public.homa_invitations,public.homa_devices,public.homa_files to service_role;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('homa-private','homa-private',false,5242880,array['application/pdf','image/jpeg','image/png','image/webp','text/plain']) on conflict(id) do nothing;
-- No public links and no broad storage policies. API issues short-lived URLs
-- only after checking membership or the device's limited allowed_members.
commit;
