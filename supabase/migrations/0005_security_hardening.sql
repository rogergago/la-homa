-- Endurecimiento de seguridad. Ejecutar después de 0004.
-- Cambios: el panel exige verificación en dos pasos, la sincronización tiene límites,
-- las invitaciones no se pueden adivinar a fuerza de intentos y nada nuevo nace abierto.

begin;

-- Lo que se cree a partir de ahora en public no queda abierto al navegador sin un grant explícito.
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;

revoke all on function public.homa_can_read(uuid) from public, anon;
grant execute on function public.homa_can_read(uuid) to authenticated;
revoke all on function public.site_posts_touch() from public, anon, authenticated;
drop function if exists public.homa_operator_overview();

-- Panel: cuenta operadora y sesión verificada con el segundo factor (aal2).

create or replace function public.homa_operator_session()
returns boolean
language sql stable security definer set search_path = public as $$
  select public.homa_is_operator() and coalesce(auth.jwt()->>'aal', '') = 'aal2'
$$;

revoke all on function public.homa_operator_session() from public, anon;
grant execute on function public.homa_operator_session() to authenticated;

create or replace function public.homa_admin_guard()
returns uuid
language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null or not public.homa_is_operator() then
    raise exception 'FORBIDDEN';
  end if;
  if coalesce(auth.jwt()->>'aal', '') <> 'aal2' then
    raise exception 'MFA_REQUIRED';
  end if;
  return auth.uid();
end;
$$;

revoke all on function public.homa_admin_guard() from public, anon, authenticated;

drop policy if exists site_posts_member_read on public.site_posts;
drop policy if exists site_posts_operator_write on public.site_posts;
create policy site_posts_member_read on public.site_posts
  for select to authenticated
  using (status = 'published' or public.homa_operator_session());
create policy site_posts_operator_write on public.site_posts
  for all to authenticated
  using (public.homa_operator_session())
  with check (public.homa_operator_session());

-- Sincronización: límites por petición y cuota por casa.

create or replace function public.homa_push(changes jsonb)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_hid uuid;
  v_item jsonb;
  v_kind text;
  v_eid text;
  v_expected bigint;
  v_payload jsonb;
  v_current public.homa_entities%rowtype;
  v_found boolean;
  v_rows bigint;
  v_bytes bigint;
  v_applied jsonb := '[]'::jsonb;
begin
  if v_uid is null then raise exception 'FORBIDDEN'; end if;
  if jsonb_typeof(changes) is distinct from 'array' or jsonb_array_length(changes) > 200
     or octet_length(changes::text) > 8000000 then
    raise exception 'INVALID_COMMAND';
  end if;
  v_hid := public.homa_household_id();
  if v_hid is null then raise exception 'FORBIDDEN'; end if;
  if not exists (
    select 1 from public.homa_memberships m
    where m.household_id = v_hid and m.user_id = v_uid and m.revoked_at is null and m.role in ('owner', 'adult')
  ) then raise exception 'FORBIDDEN'; end if;
  perform 1 from public.homa_households h where h.id = v_hid for update;

  for v_item in select value from jsonb_array_elements(changes) loop
    if jsonb_typeof(v_item) is distinct from 'object' then raise exception 'INVALID_COMMAND'; end if;
    v_kind := v_item->>'kind';
    v_eid := v_item->>'id';
    if coalesce(v_item->>'expectedRevision', '0') !~ '^[0-9]{1,15}$' then raise exception 'INVALID_COMMAND'; end if;
    v_expected := coalesce((v_item->>'expectedRevision')::bigint, 0);
    v_payload := v_item->'after';
    if v_kind is null or v_eid is null or v_kind !~ '^[a-zA-Z.]{1,64}$' or v_eid !~ '^[A-Za-z0-9_.:@-]{1,200}$' then
      raise exception 'INVALID_COMMAND';
    end if;
    select * into v_current from public.homa_entities e
      where e.household_id = v_hid and e.kind = v_kind and e.entity_id = v_eid
      for update;
    v_found := found;
    if v_payload is null or jsonb_typeof(v_payload) = 'null' then
      if not v_found then
        v_applied := v_applied || jsonb_build_array(jsonb_build_object('kind', v_kind, 'id', v_eid, 'revision', null));
      elsif v_current.revision <> v_expected then
        raise exception 'VERSION_CONFLICT';
      else
        delete from public.homa_entities e where e.household_id = v_hid and e.kind = v_kind and e.entity_id = v_eid;
        v_applied := v_applied || jsonb_build_array(jsonb_build_object('kind', v_kind, 'id', v_eid, 'revision', null));
      end if;
    else
      if octet_length(v_payload::text) >= 1900000 then raise exception 'INVALID_COMMAND'; end if;
      if not v_found then
        if v_expected <> 0 then raise exception 'VERSION_CONFLICT'; end if;
        insert into public.homa_entities(household_id, kind, entity_id, data, revision)
          values (v_hid, v_kind, v_eid, v_payload, 1);
        v_applied := v_applied || jsonb_build_array(jsonb_build_object('kind', v_kind, 'id', v_eid, 'revision', 1));
      elsif v_current.revision = v_expected then
        update public.homa_entities e
          set data = v_payload, revision = v_current.revision + 1, updated_at = now()
          where e.household_id = v_hid and e.kind = v_kind and e.entity_id = v_eid;
        v_applied := v_applied || jsonb_build_array(jsonb_build_object('kind', v_kind, 'id', v_eid, 'revision', v_current.revision + 1));
      elsif v_current.data = v_payload then
        v_applied := v_applied || jsonb_build_array(jsonb_build_object('kind', v_kind, 'id', v_eid, 'revision', v_current.revision));
      else
        raise exception 'VERSION_CONFLICT';
      end if;
    end if;
  end loop;

  select count(*), coalesce(sum(pg_column_size(e.data)), 0) into v_rows, v_bytes
    from public.homa_entities e where e.household_id = v_hid;
  if v_rows > 25000 or v_bytes > 26214400 then raise exception 'QUOTA_EXCEEDED'; end if;

  update public.homa_households set revision = revision + 1 where id = v_hid;
  return v_applied;
end;
$$;

revoke all on function public.homa_push(jsonb) from public, anon;
grant execute on function public.homa_push(jsonb) to authenticated;

-- Invitaciones: códigos de 64 bits, como mucho 10 abiertas por casa y 10 fallos por hora y cuenta.

create table if not exists public.homa_invite_attempts (
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists homa_invite_attempts_user_idx on public.homa_invite_attempts (user_id, created_at);
alter table public.homa_invite_attempts enable row level security;
revoke all on public.homa_invite_attempts from public, anon, authenticated;

create or replace function public.homa_invite()
returns text
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_uid uuid := auth.uid();
  v_hid uuid;
  v_code text;
begin
  if v_uid is null then raise exception 'FORBIDDEN'; end if;
  v_hid := public.homa_household_id();
  if v_hid is null then raise exception 'FORBIDDEN'; end if;
  if not exists (
    select 1 from public.homa_memberships m
    where m.household_id = v_hid and m.user_id = v_uid and m.revoked_at is null and m.role in ('owner', 'adult')
  ) then raise exception 'FORBIDDEN'; end if;
  if (select count(*) from public.homa_invitations i
      where i.household_id = v_hid and i.accepted_at is null and i.revoked_at is null and i.expires_at > now()) >= 10 then
    raise exception 'TOO_MANY_INVITES';
  end if;
  v_code := encode(extensions.gen_random_bytes(8), 'hex');
  insert into public.homa_invitations(household_id, token_hash, email, invited_by, expires_at)
    values (v_hid, encode(extensions.digest(v_code, 'sha256'), 'hex'), '', v_uid, now() + interval '7 days');
  return v_code;
end;
$$;

-- Un código incorrecto devuelve null en vez de un error para que el intento quede anotado.
create or replace function public.homa_accept(p_code text)
returns uuid
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_uid uuid := auth.uid();
  v_hid uuid;
  v_invite public.homa_invitations%rowtype;
  v_code text := lower(regexp_replace(coalesce(p_code, ''), '\s', '', 'g'));
begin
  if v_uid is null then raise exception 'FORBIDDEN'; end if;
  delete from public.homa_invite_attempts a where a.created_at < now() - interval '1 day';
  if (select count(*) from public.homa_invite_attempts a
      where a.user_id = v_uid and a.created_at > now() - interval '1 hour') >= 10 then
    raise exception 'TOO_MANY_ATTEMPTS';
  end if;
  if public.homa_household_id() is not null then raise exception 'ALREADY_IN_HOUSEHOLD'; end if;
  if v_code ~ '^([a-f0-9]{10}|[a-f0-9]{16})$' then
    select * into v_invite from public.homa_invitations i
      where i.token_hash = encode(extensions.digest(v_code, 'sha256'), 'hex')
        and i.accepted_at is null and i.revoked_at is null and i.expires_at > now()
      for update;
  end if;
  if v_invite.id is null then
    insert into public.homa_invite_attempts(user_id) values (v_uid);
    return null;
  end if;
  v_hid := v_invite.household_id;
  insert into public.homa_memberships(household_id, user_id, role) values (v_hid, v_uid, 'adult');
  update public.homa_invitations set accepted_at = now() where id = v_invite.id;
  delete from public.homa_invite_attempts a where a.user_id = v_uid;
  return v_hid;
end;
$$;

revoke all on function public.homa_invite() from public, anon;
revoke all on function public.homa_accept(text) from public, anon;
grant execute on function public.homa_invite() to authenticated;
grant execute on function public.homa_accept(text) to authenticated;

commit;
