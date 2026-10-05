-- Panel: parentesco (padre/madre/hijo/hija) en la ficha de cuenta.
-- Se guarda en auth.users.raw_user_meta_data.relation al crear la familia.

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
      'relation', case
        when lower(btrim(coalesce(u.raw_user_meta_data->>'relation', ''))) in ('padre','madre','hijo','hija')
          then lower(btrim(u.raw_user_meta_data->>'relation'))
        else null
      end,
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
