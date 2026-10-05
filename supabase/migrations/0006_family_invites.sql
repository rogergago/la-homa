-- Invitaciones por correo a adultos y niños, vínculo cuenta↔perfil y rol child.

begin;

alter table public.homa_memberships
  drop constraint if exists homa_memberships_role_check;

alter table public.homa_memberships
  add column if not exists linked_member_id text;

alter table public.homa_memberships
  add constraint homa_memberships_role_check
  check (role in ('owner', 'adult', 'child'));

alter table public.homa_invitations
  add column if not exists member_id text;

alter table public.homa_invitations
  add column if not exists invite_role text not null default 'adult';

alter table public.homa_invitations
  drop constraint if exists homa_invitations_invite_role_check;

alter table public.homa_invitations
  add constraint homa_invitations_invite_role_check
  check (invite_role in ('adult', 'child'));

create or replace function public.homa_push(changes jsonb)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
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
    where m.household_id = v_hid and m.user_id = v_uid and m.revoked_at is null
      and m.role in ('owner', 'adult', 'child')
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

create or replace function public.homa_invite_person(
  p_email text default '',
  p_member_id text default null,
  p_role text default 'adult'
)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_uid uuid := auth.uid();
  v_hid uuid;
  v_code text;
  v_email text := lower(trim(coalesce(p_email, '')));
  v_role text := lower(trim(coalesce(p_role, 'adult')));
  v_member text := nullif(trim(coalesce(p_member_id, '')), '');
begin
  if v_uid is null then raise exception 'FORBIDDEN'; end if;
  v_hid := public.homa_household_id();
  if v_hid is null then raise exception 'FORBIDDEN'; end if;
  if not exists (
    select 1 from public.homa_memberships m
    where m.household_id = v_hid and m.user_id = v_uid and m.revoked_at is null and m.role in ('owner', 'adult')
  ) then raise exception 'FORBIDDEN'; end if;
  if v_role not in ('adult', 'child') then raise exception 'INVALID_ROLE'; end if;
  if v_email <> '' and v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'INVALID_EMAIL'; end if;
  if v_member is not null and v_member !~ '^[A-Za-z0-9_.:@-]{1,200}$' then raise exception 'INVALID_MEMBER'; end if;
  if (select count(*) from public.homa_invitations i
      where i.household_id = v_hid and i.accepted_at is null and i.revoked_at is null and i.expires_at > now()) >= 10 then
    raise exception 'TOO_MANY_INVITES';
  end if;
  v_code := encode(extensions.gen_random_bytes(8), 'hex');
  insert into public.homa_invitations(household_id, token_hash, email, invited_by, expires_at, member_id, invite_role)
    values (v_hid, encode(extensions.digest(v_code, 'sha256'), 'hex'), v_email, v_uid, now() + interval '7 days', v_member, v_role);
  return jsonb_build_object(
    'code', v_code,
    'email', v_email,
    'role', v_role,
    'memberId', v_member,
    'expiresInDays', 7
  );
end;
$$;

create or replace function public.homa_invite()
returns text
language plpgsql security definer set search_path = public as $$
declare
  v_result jsonb;
begin
  v_result := public.homa_invite_person('', null, 'adult');
  return v_result->>'code';
end;
$$;

drop function if exists public.homa_accept(text);

create function public.homa_accept(p_code text)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_uid uuid := auth.uid();
  v_hid uuid;
  v_invite public.homa_invitations%rowtype;
  v_code text := lower(regexp_replace(coalesce(p_code, ''), '\s', '', 'g'));
  v_role text;
  v_member text;
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
  if v_invite.email <> '' then
    if lower(coalesce((select email from auth.users where id = v_uid), '')) <> lower(v_invite.email) then
      insert into public.homa_invite_attempts(user_id) values (v_uid);
      raise exception 'INVITE_EMAIL_MISMATCH';
    end if;
  end if;
  v_hid := v_invite.household_id;
  v_role := case when v_invite.invite_role = 'child' then 'child' else 'adult' end;
  v_member := v_invite.member_id;
  insert into public.homa_memberships(household_id, user_id, role, linked_member_id)
    values (v_hid, v_uid, v_role, v_member);
  update public.homa_invitations set accepted_at = now() where id = v_invite.id;
  delete from public.homa_invite_attempts a where a.user_id = v_uid;
  return jsonb_build_object(
    'householdId', v_hid,
    'role', v_role,
    'memberId', v_member
  );
end;
$$;

create or replace function public.homa_my_link()
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_row public.homa_memberships%rowtype;
begin
  if v_uid is null then raise exception 'FORBIDDEN'; end if;
  select * into v_row from public.homa_memberships m
    where m.user_id = v_uid and m.revoked_at is null
    order by (m.role = 'owner') desc, m.joined_at
    limit 1;
  if v_row.user_id is null then
    return jsonb_build_object('role', null, 'linkedMemberId', null, 'isOwner', false);
  end if;
  return jsonb_build_object(
    'role', v_row.role,
    'linkedMemberId', v_row.linked_member_id,
    'isOwner', v_row.role = 'owner'
  );
end;
$$;

revoke all on function public.homa_invite_person(text, text, text) from public, anon;
revoke all on function public.homa_my_link() from public, anon;
revoke all on function public.homa_accept(text) from public, anon;
grant execute on function public.homa_invite_person(text, text, text) to authenticated;
grant execute on function public.homa_my_link() to authenticated;
grant execute on function public.homa_invite() to authenticated;
grant execute on function public.homa_accept(text) to authenticated;
grant execute on function public.homa_push(jsonb) to authenticated;

commit;
