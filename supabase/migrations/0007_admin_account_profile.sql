-- Panel: datos de contacto del registro en la ficha de cuenta.
-- Vienen de auth.users.raw_user_meta_data (signUp), no del interior de la casa.

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
      'phone', coalesce(
        nullif(btrim(coalesce(u.raw_user_meta_data->>'phone', '')), ''),
        nullif(btrim(coalesce(u.phone, '')), ''),
        ''
      ),
      'birthday', nullif(btrim(coalesce(u.raw_user_meta_data->>'birthday', '')), ''),
      'country', nullif(btrim(coalesce(u.raw_user_meta_data->>'country', '')), ''),
      'province', nullif(btrim(coalesce(u.raw_user_meta_data->>'province', '')), ''),
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

-- El teléfono del titular en la ficha de familia también sale del registro.
create or replace function public.homa_admin_household_card(h public.homa_households)
returns jsonb
language sql stable security definer set search_path = public as $$
  with holder as (
    select u.id, u.email, u.created_at, u.last_sign_in_at,
           coalesce(
             nullif(btrim(coalesce(u.raw_user_meta_data->>'phone', '')), ''),
             nullif(btrim(coalesce(u.phone, '')), ''),
             ''
           ) as phone,
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
