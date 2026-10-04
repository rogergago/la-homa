-- Web comercial y panel de La Homa. Ejecutar una vez en el editor SQL de Supabase.
-- La clave secreta no se usa aquí. El navegador solo entra con la sesión de una persona.
-- Después, en admin.lahoma.app, la propia pantalla indica la línea que te hace operador.

begin;

create table if not exists public.homa_operators (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.homa_operators enable row level security;
revoke all on public.homa_operators from public, anon, authenticated;

create or replace function public.homa_is_operator()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.homa_operators o
    where o.user_id = auth.uid()
  )
$$;

revoke all on function public.homa_is_operator() from public, anon;
grant execute on function public.homa_is_operator() to authenticated;

create table if not exists public.site_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' and char_length(slug) between 3 and 80),
  title text not null check (char_length(btrim(title)) between 1 and 140),
  excerpt text not null default '' check (char_length(excerpt) <= 300),
  body text not null default '' check (char_length(body) <= 50000),
  seo_title text not null default '' check (char_length(seo_title) <= 70),
  seo_description text not null default '' check (char_length(seo_description) <= 180),
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists site_posts_published_idx
  on public.site_posts (published_at desc)
  where status = 'published';

create or replace function public.site_posts_touch()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  if new.status = 'published' and (tg_op = 'INSERT' or old.status is distinct from 'published') then
    new.published_at = coalesce(new.published_at, now());
  end if;
  if new.status <> 'published' then
    new.published_at = null;
  end if;
  return new;
end;
$$;

drop trigger if exists site_posts_touch on public.site_posts;
create trigger site_posts_touch
  before insert or update on public.site_posts
  for each row execute function public.site_posts_touch();

alter table public.site_posts enable row level security;
revoke all on public.site_posts from public, anon, authenticated;
grant select on public.site_posts to anon, authenticated;
grant insert, update, delete on public.site_posts to authenticated;

drop policy if exists site_posts_public_read on public.site_posts;
drop policy if exists site_posts_member_read on public.site_posts;
drop policy if exists site_posts_operator_write on public.site_posts;
create policy site_posts_public_read on public.site_posts
  for select to anon
  using (status = 'published');
create policy site_posts_member_read on public.site_posts
  for select to authenticated
  using (status = 'published' or public.homa_is_operator());
create policy site_posts_operator_write on public.site_posts
  for all to authenticated
  using (public.homa_is_operator())
  with check (public.homa_is_operator());

create or replace function public.homa_operator_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if auth.uid() is null or not public.homa_is_operator() then
    raise exception 'FORBIDDEN';
  end if;

  select jsonb_build_object(
    'households', coalesce((
      select jsonb_agg(item)
      from (
        select jsonb_build_object(
          'name', h.name,
          'createdAt', h.created_at,
          'lastActivity', (
            select max(e.updated_at) from public.homa_entities e where e.household_id = h.id
          ),
          'adults', (
            select count(*) from public.homa_entities e
            where e.household_id = h.id and e.kind = 'members'
              and e.data->>'role' = 'adult'
              and coalesce(e.data->>'active', 'true') <> 'false'
          ),
          'children', (
            select count(*) from public.homa_entities e
            where e.household_id = h.id and e.kind = 'members'
              and e.data->>'role' = 'member'
              and coalesce(e.data->>'active', 'true') <> 'false'
          ),
          'pets', (
            select count(*) from public.homa_entities e
            where e.household_id = h.id and e.kind = 'members'
              and e.data->>'role' = 'pet'
              and coalesce(e.data->>'active', 'true') <> 'false'
          ),
          'accounts', (
            select count(*) from public.homa_memberships m
            where m.household_id = h.id and m.revoked_at is null
          )
        ) as item
        from public.homa_households h
        order by (
          select max(e.updated_at) from public.homa_entities e where e.household_id = h.id
        ) desc nulls last
        limit 200
      ) houses
    ), '[]'::jsonb),
    'signups', coalesce((
      select jsonb_agg(item)
      from (
        select jsonb_build_object(
          'email', coalesce(u.email, ''),
          'createdAt', u.created_at,
          'provider', case when coalesce(u.raw_app_meta_data->>'provider', '') = 'google' then 'google' else 'email' end,
          'hasHome', exists (
            select 1 from public.homa_memberships m
            where m.user_id = u.id and m.revoked_at is null
          )
        ) as item
        from auth.users u
        where u.created_at > now() - interval '7 days'
        order by u.created_at desc
        limit 50
      ) recent
    ), '[]'::jsonb),
    'totals', jsonb_build_object(
      'households', (select count(*) from public.homa_households),
      'accounts', (select count(*) from auth.users),
      'postsPublished', (select count(*) from public.site_posts where status = 'published'),
      'postsDraft', (select count(*) from public.site_posts where status = 'draft')
    )
  ) into result;

  return result;
end;
$$;

revoke all on function public.homa_operator_overview() from public, anon;
grant execute on function public.homa_operator_overview() to authenticated;

commit;
