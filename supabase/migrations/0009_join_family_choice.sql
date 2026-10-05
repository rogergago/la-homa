-- Allow joining a family after signup created an empty personal household.
-- Also keep accepting invites when the user has not finished the family guide.

begin;

create or replace function public.homa_abandon_empty_household()
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_hid uuid;
  v_ready boolean;
begin
  if v_uid is null then raise exception 'FORBIDDEN'; end if;
  v_hid := public.homa_household_id();
  if v_hid is null then return false; end if;
  if not exists (
    select 1 from public.homa_memberships m
    where m.household_id = v_hid and m.user_id = v_uid and m.revoked_at is null and m.role = 'owner'
  ) then return false; end if;
  if exists (
    select 1 from public.homa_memberships m
    where m.household_id = v_hid and m.user_id <> v_uid and m.revoked_at is null
  ) then return false; end if;
  select coalesce((e.data->>'familyReady')::boolean, false) into v_ready
  from public.homa_entities e
  where e.household_id = v_hid and e.kind = 'settings' and e.entity_id = 'settings'
  limit 1;
  if coalesce(v_ready, false) then return false; end if;
  delete from public.homa_entities where household_id = v_hid;
  delete from public.homa_memberships where household_id = v_hid;
  delete from public.homa_invitations where household_id = v_hid and accepted_at is null;
  delete from public.homa_households where id = v_hid;
  return true;
end;
$$;

revoke all on function public.homa_abandon_empty_household() from public, anon;
grant execute on function public.homa_abandon_empty_household() to authenticated;

create or replace function public.homa_accept(p_code text)
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
  if public.homa_household_id() is not null then
    if not public.homa_abandon_empty_household() then
      raise exception 'ALREADY_IN_HOUSEHOLD';
    end if;
  end if;
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

revoke all on function public.homa_accept(text) from public, anon;
grant execute on function public.homa_accept(text) to authenticated;

commit;
