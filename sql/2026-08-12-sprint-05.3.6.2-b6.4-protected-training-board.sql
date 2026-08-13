-- Sprint 05.3.6.2 B.6.4
-- Protected /training Team Attendance Board
-- Environment: DEV first
-- Purpose:
--   * anonymous viewers may see aggregate RSVP counts only
--   * authenticated members of the training team may see names
--   * RSVP writes are authenticated-only via the server API/service role
--   * legacy public RPC is preserved for compatibility but no longer executable by anon/authenticated

begin;

-- Anonymous access must not be able to read/write attendance rows directly.
revoke all on table public.training_attendance from anon;

-- Keep existing authenticated table privileges, but replace the legacy public SELECT policy.
drop policy if exists "Public can read attendance" on public.training_attendance;
drop policy if exists "05.3.6.2 authenticated team attendance read" on public.training_attendance;

create policy "05.3.6.2 authenticated team attendance read"
on public.training_attendance
for select
to authenticated
using (
  app_private.is_active_profile()
  and exists (
    select 1
    from public.trainings training
    where training.id = training_attendance.training_id
      and training.team_id is not null
      and (
        app_private.has_global_permission('attendance.mark')
        or app_private.has_team_permission('attendance.mark', training.team_id)
        or app_private.has_team_permission('attendance.respond_own', training.team_id)
      )
  )
);

-- Direct RPC exposure is tightened. The server API continues to use service_role.
revoke all on function public.get_my_training_attendance(uuid) from public;
revoke all on function public.get_my_training_attendance(uuid) from anon;
grant execute on function public.get_my_training_attendance(uuid) to authenticated;

revoke all on function public.respond_to_player_training(uuid, uuid, text) from public;
revoke all on function public.respond_to_player_training(uuid, uuid, text) from anon;
revoke all on function public.respond_to_player_training(uuid, uuid, text) from authenticated;
grant execute on function public.respond_to_player_training(uuid, uuid, text) to service_role;

revoke all on function public.respond_to_training_public(uuid, uuid, text) from public;
revoke all on function public.respond_to_training_public(uuid, uuid, text) from anon;
revoke all on function public.respond_to_training_public(uuid, uuid, text) from authenticated;
grant execute on function public.respond_to_training_public(uuid, uuid, text) to service_role;

create or replace function public.get_training_attendance_board(
  p_training_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_profile_id uuid := auth.uid();
  v_training_team_id uuid;
  v_training_title text;
  v_training_starts_at timestamptz;
  v_training_location text;
  v_training_team_name text;
  v_player_id uuid;
  v_player_name text;
  v_shirt_number integer;
  v_position text;
  v_can_view_names boolean := false;
  v_can_respond boolean := false;
  v_my_status text;
  v_my_updated_at timestamptz;
  v_yes_count integer := 0;
  v_maybe_count integer := 0;
  v_no_count integer := 0;
  v_total_count integer := 0;
  v_latest_updated_at timestamptz;
  v_rows jsonb := '[]'::jsonb;
begin
  select
    training.team_id,
    training.title,
    training.starts_at,
    training.location,
    training.team_name
  into
    v_training_team_id,
    v_training_title,
    v_training_starts_at,
    v_training_location,
    v_training_team_name
  from public.trainings training
  where training.id = p_training_id
    and training.is_active = true
    and training.status = 'scheduled';

  if v_training_team_id is null then
    raise exception 'Training is not available.' using errcode = '42501';
  end if;

  if v_profile_id is not null then
    select
      membership.player_id,
      coalesce(nullif(btrim(player.display_name), ''), player.full_name),
      player.shirt_number,
      player.position
    into
      v_player_id,
      v_player_name,
      v_shirt_number,
      v_position
    from public.profiles profile
    join public.team_memberships membership
      on membership.profile_id = profile.id
    join public.players player
      on player.id = membership.player_id
    where profile.id = v_profile_id
      and profile.account_status = 'active'
      and membership.team_id = v_training_team_id
      and membership.status = 'active'
      and membership.archived_at is null
      and membership.valid_from <= current_date
      and (membership.valid_to is null or membership.valid_to >= current_date)
      and player.is_active = true
    order by membership.created_at
    limit 1;

    v_can_respond :=
      v_player_id is not null
      and app_private.has_team_permission(
        'attendance.respond_own',
        v_training_team_id
      );

    v_can_view_names :=
      v_player_id is not null
      or app_private.has_global_permission('attendance.mark')
      or app_private.has_team_permission('attendance.mark', v_training_team_id);
  end if;

  select
    count(*) filter (where attendance.status = 'yes'),
    count(*) filter (where attendance.status = 'maybe'),
    count(*) filter (where attendance.status = 'no'),
    count(*) filter (where attendance.status in ('yes', 'maybe', 'no')),
    max(attendance.updated_at)
  into
    v_yes_count,
    v_maybe_count,
    v_no_count,
    v_total_count,
    v_latest_updated_at
  from public.training_attendance attendance
  where attendance.training_id = p_training_id;

  if v_player_id is not null then
    select attendance.status, attendance.updated_at
    into v_my_status, v_my_updated_at
    from public.training_attendance attendance
    where attendance.training_id = p_training_id
      and attendance.player_id = v_player_id
    limit 1;
  end if;

  if v_can_view_names then
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', attendance.id,
          'training_id', attendance.training_id,
          'player_id', attendance.player_id,
          'player_name', attendance.player_name,
          'status', attendance.status,
          'updated_at', attendance.updated_at
        )
        order by attendance.player_name, attendance.updated_at desc
      ) filter (where attendance.status in ('yes', 'maybe', 'no')),
      '[]'::jsonb
    )
    into v_rows
    from public.training_attendance attendance
    where attendance.training_id = p_training_id;
  end if;

  return jsonb_build_object(
    'training', jsonb_build_object(
      'id', p_training_id,
      'team_id', v_training_team_id,
      'title', v_training_title,
      'starts_at', v_training_starts_at,
      'location', v_training_location,
      'team_name', v_training_team_name
    ),
    'viewer', jsonb_build_object(
      'authenticated', v_profile_id is not null,
      'profile_id', v_profile_id,
      'player_id', v_player_id,
      'player_name', v_player_name,
      'shirt_number', v_shirt_number,
      'position', v_position,
      'can_view_names', v_can_view_names,
      'can_respond', v_can_respond,
      'my_status', v_my_status,
      'my_updated_at', v_my_updated_at
    ),
    'counts', jsonb_build_object(
      'yes', coalesce(v_yes_count, 0),
      'maybe', coalesce(v_maybe_count, 0),
      'no', coalesce(v_no_count, 0),
      'total', coalesce(v_total_count, 0),
      'latest_updated_at', v_latest_updated_at
    ),
    'attendance', v_rows
  );
end;
$function$;

revoke all on function public.get_training_attendance_board(uuid) from public;
grant execute on function public.get_training_attendance_board(uuid) to anon;
grant execute on function public.get_training_attendance_board(uuid) to authenticated;

commit;
