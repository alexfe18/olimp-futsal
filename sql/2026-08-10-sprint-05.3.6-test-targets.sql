-- Sprint 05.3.6 — safe local TEST target helper
-- READ-ONLY.
-- Pick exactly one player/training pair for ATTENDANCE_WRITE_MODE=test.

select
  player.id as player_id,
  player.full_name,
  membership.profile_id,
  training.id as training_id,
  training.title,
  training.starts_at,
  training.location
from public.trainings training
join public.team_memberships membership
  on membership.team_id = training.team_id
join public.players player
  on player.id = membership.player_id
where training.is_active = true
  and training.status = 'scheduled'
  and membership.status = 'active'
  and membership.archived_at is null
  and player.is_active = true
order by
  case when membership.profile_id is not null then 0 else 1 end,
  player.full_name;
