-- Sprint 05.3.7 Phase B
-- Player Matches + team-scoped RLS foundation
-- DEV first. Backward-compatible with the current adult-only admin UI.
-- Current preflight: matches=0, competitions=0, match_player_stats=0.

begin;

-- ---------------------------------------------------------------------------
-- 1. Canonical app team scope for Matches / Competitions
-- ---------------------------------------------------------------------------

alter table public.matches
  add column if not exists team_id uuid references public.teams(id);

alter table public.competitions
  add column if not exists team_id uuid references public.teams(id);

-- Pilot compatibility: current admin forms do not yet send team_id.
-- In the adult-only pilot, missing team_id is resolved to the canonical adult team.
create or replace function app_private.sync_match_team_reference()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_adult_team_id uuid;
begin
  if new.team_id is null then
    select team.id
      into v_adult_team_id
    from public.teams team
    where team.code = 'adult'
      and team.status = 'active'
    limit 1;

    if v_adult_team_id is null then
      raise exception 'Active adult team is required for current match compatibility mode.';
    end if;

    new.team_id := v_adult_team_id;
  end if;

  return new;
end;
$$;

revoke all on function app_private.sync_match_team_reference() from public;

drop trigger if exists sync_match_team_reference on public.matches;
create trigger sync_match_team_reference
before insert or update of team_id
on public.matches
for each row execute function app_private.sync_match_team_reference();

drop trigger if exists sync_competition_team_reference on public.competitions;
create trigger sync_competition_team_reference
before insert or update of team_id
on public.competitions
for each row execute function app_private.sync_match_team_reference();

update public.matches match
set team_id = team.id
from public.teams team
where match.team_id is null
  and team.code = 'adult'
  and team.status = 'active';

update public.competitions competition
set team_id = team.id
from public.teams team
where competition.team_id is null
  and team.code = 'adult'
  and team.status = 'active';

alter table public.matches alter column team_id set not null;
alter table public.competitions alter column team_id set not null;

create index if not exists matches_team_starts_status_idx
  on public.matches (team_id, starts_at, status)
  where is_archived = false;

create index if not exists competitions_team_active_idx
  on public.competitions (team_id, is_active);

-- ---------------------------------------------------------------------------
-- 2. Permission helper for shared club reference data (opponents)
-- ---------------------------------------------------------------------------

create or replace function app_private.has_any_team_permission(
  p_permission_code text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select app_private.has_global_permission(p_permission_code)
  or exists (
    select 1
    from public.profiles profile
    join public.team_memberships membership
      on membership.profile_id = profile.id
     and membership.status = 'active'
     and membership.archived_at is null
     and membership.valid_from <= current_date
     and (membership.valid_to is null or membership.valid_to >= current_date)
    join public.roles role
      on role.id = membership.role_id
     and role.scope_type = 'team'
     and role.is_active
    join public.role_permissions role_permission
      on role_permission.role_id = role.id
    join public.permissions permission
      on permission.id = role_permission.permission_id
     and permission.code = p_permission_code
     and permission.is_active
    where profile.id = auth.uid()
      and profile.account_status = 'active'
  );
$$;

revoke all on function app_private.has_any_team_permission(text) from public;
grant execute on function app_private.has_any_team_permission(text)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3. Remove anonymous table access and dangerous non-row-scoped privileges
-- ---------------------------------------------------------------------------

revoke all on table public.matches from anon;
revoke all on table public.competitions from anon;
revoke all on table public.opponents from anon;
revoke all on table public.match_player_stats from anon;

revoke truncate, references, trigger on table public.matches from authenticated;
revoke truncate, references, trigger on table public.competitions from authenticated;
revoke truncate, references, trigger on table public.opponents from authenticated;
revoke truncate, references, trigger on table public.match_player_stats from authenticated;

grant select, insert, update, delete on table public.matches to authenticated;
grant select, insert, update, delete on table public.competitions to authenticated;
grant select, insert, update, delete on table public.opponents to authenticated;
grant select, insert, update, delete on table public.match_player_stats to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Matches: team-scoped read/write
-- ---------------------------------------------------------------------------

drop policy if exists "Authenticated users can read matches" on public.matches;
drop policy if exists "Authenticated users can insert matches" on public.matches;
drop policy if exists "Authenticated users can update matches" on public.matches;
drop policy if exists "Authenticated users can delete matches" on public.matches;

drop policy if exists "05.3.7 matches read" on public.matches;
drop policy if exists "05.3.7 matches insert" on public.matches;
drop policy if exists "05.3.7 matches update" on public.matches;
drop policy if exists "05.3.7 matches delete" on public.matches;

create policy "05.3.7 matches read"
on public.matches
for select
to authenticated
using (
  app_private.is_active_profile()
  and app_private.has_team_permission('matches.read', team_id)
);

create policy "05.3.7 matches insert"
on public.matches
for insert
to authenticated
with check (
  app_private.has_team_permission('matches.create', team_id)
);

create policy "05.3.7 matches update"
on public.matches
for update
to authenticated
using (
  app_private.has_team_permission('matches.update', team_id)
)
with check (
  app_private.has_team_permission('matches.update', team_id)
);

-- Hard delete is intentionally stricter than archive.
create policy "05.3.7 matches delete"
on public.matches
for delete
to authenticated
using (
  app_private.has_global_permission('matches.archive')
);

-- ---------------------------------------------------------------------------
-- 5. Competitions: team-scoped read/write
-- ---------------------------------------------------------------------------

drop policy if exists "Authenticated users can read competitions" on public.competitions;
drop policy if exists "Authenticated users can insert competitions" on public.competitions;
drop policy if exists "Authenticated users can update competitions" on public.competitions;
drop policy if exists "Authenticated users can delete competitions" on public.competitions;

drop policy if exists "05.3.7 competitions read" on public.competitions;
drop policy if exists "05.3.7 competitions insert" on public.competitions;
drop policy if exists "05.3.7 competitions update" on public.competitions;
drop policy if exists "05.3.7 competitions delete" on public.competitions;

create policy "05.3.7 competitions read"
on public.competitions
for select
to authenticated
using (
  app_private.is_active_profile()
  and app_private.has_team_permission('competitions.read', team_id)
);

create policy "05.3.7 competitions insert"
on public.competitions
for insert
to authenticated
with check (
  app_private.has_team_permission('competitions.create', team_id)
);

create policy "05.3.7 competitions update"
on public.competitions
for update
to authenticated
using (
  app_private.has_team_permission('competitions.update', team_id)
)
with check (
  app_private.has_team_permission('competitions.update', team_id)
);

-- There is no competitions.delete permission in the current catalog.
create policy "05.3.7 competitions delete"
on public.competitions
for delete
to authenticated
using (false);

-- ---------------------------------------------------------------------------
-- 6. Opponents: shared club reference, permission-aware
-- ---------------------------------------------------------------------------

drop policy if exists "Authenticated users can read opponents" on public.opponents;
drop policy if exists "Authenticated users can insert opponents" on public.opponents;
drop policy if exists "Authenticated users can update opponents" on public.opponents;
drop policy if exists "Authenticated users can delete opponents" on public.opponents;

drop policy if exists "05.3.7 opponents read" on public.opponents;
drop policy if exists "05.3.7 opponents insert" on public.opponents;
drop policy if exists "05.3.7 opponents update" on public.opponents;
drop policy if exists "05.3.7 opponents delete" on public.opponents;

create policy "05.3.7 opponents read"
on public.opponents
for select
to authenticated
using (
  app_private.is_active_profile()
  and app_private.has_any_team_permission('matches.read')
);

create policy "05.3.7 opponents insert"
on public.opponents
for insert
to authenticated
with check (
  app_private.has_any_team_permission('matches.create')
);

create policy "05.3.7 opponents update"
on public.opponents
for update
to authenticated
using (
  app_private.has_any_team_permission('matches.update')
)
with check (
  app_private.has_any_team_permission('matches.update')
);

create policy "05.3.7 opponents delete"
on public.opponents
for delete
to authenticated
using (
  app_private.has_global_permission('matches.archive')
);

-- ---------------------------------------------------------------------------
-- 7. Match player stats: staff team scope + player OWN read
-- ---------------------------------------------------------------------------

drop policy if exists "Authenticated users can read match player stats" on public.match_player_stats;
drop policy if exists "Authenticated users can insert match player stats" on public.match_player_stats;
drop policy if exists "Authenticated users can update match player stats" on public.match_player_stats;
drop policy if exists "Authenticated users can delete match player stats" on public.match_player_stats;

drop policy if exists "05.3.7 match stats read" on public.match_player_stats;
drop policy if exists "05.3.7 match stats insert" on public.match_player_stats;
drop policy if exists "05.3.7 match stats update" on public.match_player_stats;
drop policy if exists "05.3.7 match stats delete" on public.match_player_stats;

create policy "05.3.7 match stats read"
on public.match_player_stats
for select
to authenticated
using (
  app_private.is_active_profile()
  and exists (
    select 1
    from public.matches match
    where match.id = match_player_stats.match_id
      and (
        app_private.has_team_permission('statistics.read', match.team_id)
        or (
          app_private.is_player_self(match_player_stats.player_id)
          and app_private.has_team_permission('matches.read', match.team_id)
        )
      )
  )
);

create policy "05.3.7 match stats insert"
on public.match_player_stats
for insert
to authenticated
with check (
  exists (
    select 1
    from public.matches match
    where match.id = match_player_stats.match_id
      and app_private.has_team_permission('statistics.update', match.team_id)
  )
);

create policy "05.3.7 match stats update"
on public.match_player_stats
for update
to authenticated
using (
  exists (
    select 1
    from public.matches match
    where match.id = match_player_stats.match_id
      and app_private.has_team_permission('statistics.update', match.team_id)
  )
)
with check (
  exists (
    select 1
    from public.matches match
    where match.id = match_player_stats.match_id
      and app_private.has_team_permission('statistics.update', match.team_id)
  )
);

create policy "05.3.7 match stats delete"
on public.match_player_stats
for delete
to authenticated
using (
  exists (
    select 1
    from public.matches match
    where match.id = match_player_stats.match_id
      and app_private.has_team_permission('statistics.update', match.team_id)
  )
);

commit;
