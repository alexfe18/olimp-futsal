-- Sprint 05.3.2 — Account Provisioning
-- Project: Олімп Футзал
-- Release: 0.6.0-alpha.3
-- Purpose:
--   * add a service-role-only atomic finalizer for player Auth provisioning;
--   * link Auth/profile -> player contact -> adult team membership;
--   * assign the global member role;
--   * preserve sporting availability separately from access membership;
--   * write an audit trail without storing phone values.
--
-- IMPORTANT:
--   This migration DOES NOT create auth.users rows by itself.
--   Auth users are created by scripts/sprint-05.3.2/provision-player-accounts.mjs
--   only after a dry-run and explicit confirmation.

begin;

create or replace function public.finalize_player_account_provisioning_batch(p_rows jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item jsonb;
  v_adult_team_id uuid;
  v_player_role_id uuid;
  v_member_role_id uuid;
  v_owner_profile_id uuid;
  v_player_id uuid;
  v_profile_id uuid;
  v_contact_id uuid;
  v_membership_id uuid;
  v_phone text;
  v_player_name text;
  v_auth_phone text;
  v_count integer := 0;
  v_member_role_count integer := 0;
  v_membership_count integer := 0;
  v_contact_count integer := 0;
begin
  if jsonb_typeof(p_rows) <> 'array' then
    raise exception 'p_rows must be a JSON array.';
  end if;

  if jsonb_array_length(p_rows) < 1 or jsonb_array_length(p_rows) > 100 then
    raise exception 'p_rows must contain between 1 and 100 items.';
  end if;

  select id into v_adult_team_id
  from public.teams
  where code = 'adult' and status = 'active';

  select id into v_player_role_id
  from public.roles
  where code = 'player' and scope_type = 'team' and is_active;

  select id into v_member_role_id
  from public.roles
  where code = 'member' and scope_type = 'global' and is_active;

  select assignment.profile_id into v_owner_profile_id
  from public.user_roles assignment
  join public.roles role on role.id = assignment.role_id
  join public.profiles profile on profile.id = assignment.profile_id
  where role.code = 'owner'
    and role.scope_type = 'global'
    and assignment.is_active
    and profile.account_status = 'active'
  order by assignment.created_at
  limit 1;

  if v_adult_team_id is null then
    raise exception 'Active adult team is missing.';
  end if;

  if v_player_role_id is null then
    raise exception 'Active player team role is missing.';
  end if;

  if v_member_role_id is null then
    raise exception 'Active member global role is missing.';
  end if;

  if v_owner_profile_id is null then
    raise exception 'Active Owner profile is missing.';
  end if;

  for v_item in select value from jsonb_array_elements(p_rows) loop
    v_player_id := nullif(v_item ->> 'player_id', '')::uuid;
    v_profile_id := nullif(v_item ->> 'profile_id', '')::uuid;
    v_phone := nullif(btrim(v_item ->> 'phone_e164'), '');
    v_contact_id := null;
    v_membership_id := null;
    v_player_name := null;
    v_auth_phone := null;

    if v_player_id is null or v_profile_id is null then
      raise exception 'player_id and profile_id are required for every provisioning row.';
    end if;

    if v_phone is null or v_phone !~ '^\+[1-9][0-9]{7,14}$' then
      raise exception 'Invalid E.164 phone for player %.', v_player_id;
    end if;

    select player.full_name into v_player_name
    from public.players player
    where player.id = v_player_id;

    if v_player_name is null then
      raise exception 'Unknown player_id %.', v_player_id;
    end if;

    select auth_user.phone into v_auth_phone
    from auth.users auth_user
    where auth_user.id = v_profile_id
      and auth_user.phone_confirmed_at is not null;

    if v_auth_phone is null then
      raise exception 'Confirmed Auth user % is missing.', v_profile_id;
    end if;

    if v_auth_phone <> v_phone then
      raise exception 'Auth phone does not match prepared contact for player %.', v_player_id;
    end if;

    if not exists (select 1 from public.profiles profile where profile.id = v_profile_id) then
      raise exception 'Profile trigger did not create profile %.', v_profile_id;
    end if;

    select contact.id into v_contact_id
    from public.player_contacts contact
    where contact.player_id = v_player_id
      and contact.phone_e164 = v_phone
      and contact.is_active
      and contact.contact_owner = 'player'
      and contact.is_verified_by_club
      and contact.can_be_used_for_login
      and contact.account_requested
      and contact.provisioning_status in ('prepared', 'failed')
      and contact.provisioned_profile_id is null
    for update;

    if v_contact_id is null then
      raise exception 'Prepared account contact is missing for player %.', v_player_id;
    end if;

    if exists (
      select 1
      from public.player_contacts other_contact
      where other_contact.provisioned_profile_id = v_profile_id
        and other_contact.id <> v_contact_id
    ) then
      raise exception 'Profile % is already linked to another player contact.', v_profile_id;
    end if;

    select membership.id into v_membership_id
    from public.team_memberships membership
    where membership.team_id = v_adult_team_id
      and membership.player_id = v_player_id
      and membership.role_id = v_player_role_id
      and membership.archived_at is null
    for update;

    if v_membership_id is null then
      raise exception 'Adult player membership is missing for player %.', v_player_id;
    end if;

    if not exists (
      select 1 from public.team_memberships membership
      where membership.id = v_membership_id
        and membership.status = 'active'
    ) then
      raise exception 'Adult access membership must be active for player %.', v_player_id;
    end if;

    if exists (
      select 1
      from public.team_memberships other_membership
      where other_membership.team_id = v_adult_team_id
        and other_membership.role_id = v_player_role_id
        and other_membership.profile_id = v_profile_id
        and other_membership.id <> v_membership_id
    ) then
      raise exception 'Profile % is already linked to another adult player membership.', v_profile_id;
    end if;

    update public.profiles
    set display_name = v_player_name,
        phone_e164 = v_phone,
        account_status = 'active',
        must_change_password = true,
        archived_at = null,
        updated_at = now()
    where id = v_profile_id;

    insert into public.user_roles (
      profile_id,
      role_id,
      assigned_by,
      is_active,
      valid_from,
      valid_to
    )
    values (
      v_profile_id,
      v_member_role_id,
      v_owner_profile_id,
      true,
      now(),
      null
    )
    on conflict (profile_id, role_id) do update
    set assigned_by = excluded.assigned_by,
        is_active = true,
        valid_to = null,
        updated_at = now();

    v_member_role_count := v_member_role_count + 1;

    update public.team_memberships
    set profile_id = v_profile_id,
        status = 'active',
        archived_at = null,
        updated_at = now()
    where id = v_membership_id;

    v_membership_count := v_membership_count + 1;

    update public.player_contacts
    set provisioning_status = 'provisioned',
        provisioned_profile_id = v_profile_id,
        is_active = true,
        archived_at = null,
        updated_at = now()
    where id = v_contact_id;

    v_contact_count := v_contact_count + 1;
    v_count := v_count + 1;

    insert into public.audit_log (
      actor_profile_id,
      action,
      entity_type,
      entity_id,
      team_id,
      after_data
    )
    values (
      v_owner_profile_id,
      'player_account.provisioned',
      'player',
      v_player_id::text,
      v_adult_team_id,
      jsonb_build_object(
        'profile_id', v_profile_id,
        'member_role_assigned', true,
        'team_membership_linked', true,
        'phone_value_logged', false,
        'must_change_password', true
      )
    );
  end loop;

  insert into public.audit_log (
    actor_profile_id,
    action,
    entity_type,
    entity_id,
    team_id,
    after_data
  )
  values (
    v_owner_profile_id,
    'player_accounts.provisioning_batch',
    'team',
    v_adult_team_id::text,
    v_adult_team_id,
    jsonb_build_object(
      'accounts_finalized', v_count,
      'member_roles_assigned', v_member_role_count,
      'memberships_linked', v_membership_count,
      'contacts_provisioned', v_contact_count,
      'phone_values_logged', false,
      'release', '0.6.0-alpha.3'
    )
  );

  return jsonb_build_object(
    'accounts_finalized', v_count,
    'member_roles_assigned', v_member_role_count,
    'memberships_linked', v_membership_count,
    'contacts_provisioned', v_contact_count,
    'team_id', v_adult_team_id
  );
end;
$$;

revoke all on function public.finalize_player_account_provisioning_batch(jsonb) from public;
revoke all on function public.finalize_player_account_provisioning_batch(jsonb) from anon;
revoke all on function public.finalize_player_account_provisioning_batch(jsonb) from authenticated;
grant execute on function public.finalize_player_account_provisioning_batch(jsonb) to service_role;


create or replace function public.prepare_player_account_deprovisioning_batch(p_profile_ids uuid[])
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile_id uuid;
  v_player_id uuid;
  v_team_id uuid;
  v_player_role_id uuid;
  v_member_role_id uuid;
  v_owner_profile_id uuid;
  v_count integer := 0;
begin
  if p_profile_ids is null or coalesce(array_length(p_profile_ids, 1), 0) < 1 then
    raise exception 'p_profile_ids must contain at least one profile id.';
  end if;

  select id into v_team_id from public.teams where code = 'adult' and status = 'active';
  select id into v_player_role_id from public.roles where code = 'player' and scope_type = 'team' and is_active;
  select id into v_member_role_id from public.roles where code = 'member' and scope_type = 'global' and is_active;

  select assignment.profile_id into v_owner_profile_id
  from public.user_roles assignment
  join public.roles role on role.id = assignment.role_id
  join public.profiles profile on profile.id = assignment.profile_id
  where role.code = 'owner'
    and role.scope_type = 'global'
    and assignment.is_active
    and profile.account_status = 'active'
  order by assignment.created_at
  limit 1;

  if v_team_id is null or v_player_role_id is null or v_member_role_id is null then
    raise exception 'Required adult/player/member foundation is missing.';
  end if;

  foreach v_profile_id in array p_profile_ids loop
    v_player_id := null;

    select contact.player_id into v_player_id
    from public.player_contacts contact
    where contact.provisioned_profile_id = v_profile_id
      and contact.provisioning_status = 'provisioned'
      and contact.account_requested
      and contact.is_active
    for update;

    if v_player_id is null then
      raise exception 'Provisioned contact not found for profile %.', v_profile_id;
    end if;

    update public.player_contacts
    set provisioning_status = 'prepared',
        provisioned_profile_id = null,
        updated_at = now()
    where player_id = v_player_id
      and provisioned_profile_id = v_profile_id
      and is_active;

    update public.team_memberships
    set profile_id = null,
        status = 'active',
        updated_at = now()
    where team_id = v_team_id
      and player_id = v_player_id
      and role_id = v_player_role_id
      and profile_id = v_profile_id
      and archived_at is null;

    update public.user_roles
    set is_active = false,
        valid_to = now(),
        updated_at = now()
    where profile_id = v_profile_id
      and role_id = v_member_role_id
      and is_active;

    update public.profiles
    set account_status = 'archived',
        archived_at = now(),
        updated_at = now()
    where id = v_profile_id;

    insert into public.audit_log (
      actor_profile_id,
      action,
      entity_type,
      entity_id,
      team_id,
      after_data
    )
    values (
      v_owner_profile_id,
      'player_account.deprovisioning_prepared',
      'player',
      v_player_id::text,
      v_team_id,
      jsonb_build_object(
        'profile_id', v_profile_id,
        'contact_reset_to_prepared', true,
        'membership_profile_unlinked', true,
        'member_role_disabled', true,
        'profile_archived_pending_auth_delete', true,
        'phone_value_logged', false
      )
    );

    v_count := v_count + 1;
  end loop;

  return jsonb_build_object('profiles_prepared_for_delete', v_count, 'team_id', v_team_id);
end;
$$;

revoke all on function public.prepare_player_account_deprovisioning_batch(uuid[]) from public;
revoke all on function public.prepare_player_account_deprovisioning_batch(uuid[]) from anon;
revoke all on function public.prepare_player_account_deprovisioning_batch(uuid[]) from authenticated;
grant execute on function public.prepare_player_account_deprovisioning_batch(uuid[]) to service_role;

commit;
