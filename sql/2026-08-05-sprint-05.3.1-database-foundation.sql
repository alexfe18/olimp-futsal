-- Sprint 05.3.1 — Users, Roles & Teams Database Foundation
-- Project: «Олімп Футзал»
-- Release line: 0.6.0-alpha.2
--
-- Scope:
--   * additive RBAC/team/account data model;
--   * one canonical adult team (`adult` / `Олімп Футзал`);
--   * backfill legacy adult-team aliases (`Олімп Футзал`, `Дорослі`) to team_id;
--   * active access memberships for every current player card;
--     players.is_active remains the separate sporting/availability status;
--   * initial owner profile/role for the existing Supabase Auth administrator;
--   * RLS helpers and restrictive policies for NEW foundation tables only;
--   * no player Auth accounts are created in this migration;
--   * no broad legacy policies are removed in this migration.
--
-- IMPORTANT:
--   If the project contains more than one auth.users row, set
--   v_initial_owner_id in the owner bootstrap DO block below before execution.

begin;

create extension if not exists pgcrypto;

create schema if not exists app_private;
revoke all on schema app_private from public;
grant usage on schema app_private to authenticated, service_role;

create or replace function app_private.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function app_private.set_updated_at() from public;

-- ---------------------------------------------------------------------------
-- 1. Core foundation tables
-- ---------------------------------------------------------------------------

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  name text not null,
  short_name text,
  slug text not null,
  category text,
  age_group text,
  season text,
  status text not null default 'active',
  default_location text,
  logo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint teams_code_check check (code ~ '^[a-z0-9][a-z0-9_-]{1,49}$'),
  constraint teams_slug_check check (slug ~ '^[a-z0-9][a-z0-9-]{1,79}$'),
  constraint teams_name_check check (length(btrim(name)) between 2 and 160),
  constraint teams_status_check check (status in ('active', 'inactive', 'archived')),
  constraint teams_code_key unique (code),
  constraint teams_slug_key unique (slug)
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  email_snapshot text,
  phone_e164 text,
  avatar_url text,
  account_status text not null default 'invited',
  locale text not null default 'uk',
  last_seen_at timestamptz,
  must_change_password boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint profiles_display_name_check check (length(btrim(display_name)) between 1 and 160),
  constraint profiles_account_status_check check (account_status in ('invited', 'active', 'suspended', 'archived')),
  constraint profiles_phone_check check (phone_e164 is null or phone_e164 ~ '^\+[1-9][0-9]{7,14}$')
);

create table if not exists public.permissions (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  module text not null,
  action text not null,
  scope_type text not null,
  name text not null,
  description text,
  is_dangerous boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint permissions_code_check check (code ~ '^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$'),
  constraint permissions_scope_check check (scope_type in ('global', 'team', 'own', 'linked', 'public')),
  constraint permissions_code_key unique (code)
);

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  name text not null,
  description text,
  scope_type text not null,
  is_system boolean not null default false,
  is_active boolean not null default true,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint roles_code_check check (code ~ '^[a-z][a-z0-9_]{1,79}$'),
  constraint roles_scope_check check (scope_type in ('global', 'team')),
  constraint roles_name_check check (length(btrim(name)) between 2 and 120),
  constraint roles_code_key unique (code)
);

create table if not exists public.role_permissions (
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (role_id, permission_id)
);

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete restrict,
  assigned_by uuid references public.profiles(id) on delete set null,
  valid_from timestamptz not null default now(),
  valid_to timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_roles_validity_check check (valid_to is null or valid_to > valid_from),
  constraint user_roles_profile_role_key unique (profile_id, role_id)
);

create table if not exists public.team_memberships (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete restrict,
  profile_id uuid references public.profiles(id) on delete set null,
  player_id uuid references public.players(id) on delete restrict,
  role_id uuid not null references public.roles(id) on delete restrict,
  status text not null default 'active',
  valid_from date not null default current_date,
  valid_to date,
  shirt_number integer,
  is_primary boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint team_memberships_subject_check check (profile_id is not null or player_id is not null),
  constraint team_memberships_status_check check (status in ('active', 'inactive', 'ended', 'archived')),
  constraint team_memberships_validity_check check (valid_to is null or valid_to >= valid_from),
  constraint team_memberships_shirt_number_check check (shirt_number is null or shirt_number between 0 and 999),
  constraint team_memberships_team_player_role_key unique (team_id, player_id, role_id),
  constraint team_memberships_team_profile_role_key unique (team_id, profile_id, role_id)
);

create table if not exists public.player_contacts (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  phone_e164 text not null,
  contact_owner text not null default 'player',
  owner_name text,
  is_primary boolean not null default true,
  is_verified_by_club boolean not null default false,
  verified_at timestamptz,
  can_be_used_for_login boolean not null default false,
  can_receive_notifications boolean not null default true,
  account_requested boolean not null default false,
  provisioning_status text not null default 'not_requested',
  provisioned_profile_id uuid references public.profiles(id) on delete set null,
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint player_contacts_phone_check check (phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  constraint player_contacts_owner_check check (contact_owner in ('player', 'guardian', 'other')),
  constraint player_contacts_provisioning_check check (provisioning_status in ('not_requested', 'prepared', 'provisioned', 'failed', 'cancelled')),
  constraint player_contacts_player_phone_key unique (player_id, phone_e164),
  constraint player_contacts_login_rules_check check (
    not can_be_used_for_login
    or (contact_owner = 'player' and is_verified_by_club)
  )
);

create table if not exists public.guardian_player_links (
  id uuid primary key default gen_random_uuid(),
  guardian_profile_id uuid not null references public.profiles(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  relationship text,
  can_respond_attendance boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint guardian_player_links_key unique (guardian_profile_id, player_id)
);

create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  channel text not null default 'email',
  email text,
  phone_e164 text,
  token_hash text not null,
  global_role_id uuid references public.roles(id) on delete restrict,
  team_id uuid references public.teams(id) on delete restrict,
  team_role_id uuid references public.roles(id) on delete restrict,
  player_id uuid references public.players(id) on delete set null,
  status text not null default 'pending',
  expires_at timestamptz not null,
  accepted_at timestamptz,
  cancelled_at timestamptz,
  invited_by uuid references public.profiles(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint invitations_channel_check check (channel in ('email', 'phone')),
  constraint invitations_status_check check (status in ('pending', 'accepted', 'expired', 'cancelled')),
  constraint invitations_contact_check check (
    (channel = 'email' and email is not null and phone_e164 is null)
    or (channel = 'phone' and phone_e164 is not null and email is null)
  ),
  constraint invitations_phone_check check (phone_e164 is null or phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  constraint invitations_expiry_check check (expires_at > created_at),
  constraint invitations_token_hash_key unique (token_hash)
);

create table if not exists public.audit_log (
  id bigint generated by default as identity primary key,
  actor_profile_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  team_id uuid references public.teams(id) on delete set null,
  before_data jsonb,
  after_data jsonb,
  request_id text,
  ip_hash text,
  user_agent text,
  created_at timestamptz not null default now(),
  constraint audit_log_action_check check (length(btrim(action)) between 3 and 160),
  constraint audit_log_entity_type_check check (length(btrim(entity_type)) between 2 and 120)
);

comment on table public.player_contacts is
  'Private club-verified contact data. Phone values must never be committed to Git or exposed in public responses.';
comment on table public.audit_log is
  'Append-only audit trail for security and critical business actions.';

-- ---------------------------------------------------------------------------
-- 2. Indexes and updated_at triggers
-- ---------------------------------------------------------------------------

create index if not exists profiles_account_status_idx on public.profiles (account_status);
create index if not exists roles_scope_active_idx on public.roles (scope_type, is_active, sort_order);
create index if not exists permissions_module_active_idx on public.permissions (module, is_active, code);
create index if not exists user_roles_profile_active_idx on public.user_roles (profile_id, is_active);
create index if not exists user_roles_role_active_idx on public.user_roles (role_id, is_active);
create index if not exists teams_status_season_idx on public.teams (status, season);
create index if not exists team_memberships_team_status_idx on public.team_memberships (team_id, status);
create index if not exists team_memberships_profile_status_idx on public.team_memberships (profile_id, status);
create index if not exists team_memberships_player_status_idx on public.team_memberships (player_id, status);
create index if not exists player_contacts_player_active_idx on public.player_contacts (player_id, is_active);
create unique index if not exists player_contacts_login_phone_unique_idx
  on public.player_contacts (phone_e164)
  where can_be_used_for_login and is_active;
create index if not exists guardian_player_links_guardian_active_idx
  on public.guardian_player_links (guardian_profile_id, is_active);
create index if not exists guardian_player_links_player_active_idx
  on public.guardian_player_links (player_id, is_active);
create index if not exists invitations_status_expiry_idx on public.invitations (status, expires_at);
create index if not exists invitations_email_status_idx on public.invitations (lower(email), status)
  where email is not null;
create index if not exists invitations_phone_status_idx on public.invitations (phone_e164, status)
  where phone_e164 is not null;
create index if not exists audit_log_entity_created_idx
  on public.audit_log (entity_type, entity_id, created_at desc);
create index if not exists audit_log_actor_created_idx
  on public.audit_log (actor_profile_id, created_at desc);
create index if not exists audit_log_team_created_idx
  on public.audit_log (team_id, created_at desc);

DO $triggers$
declare
  v_table text;
begin
  foreach v_table in array array[
    'teams', 'profiles', 'permissions', 'roles', 'user_roles',
    'team_memberships', 'player_contacts', 'guardian_player_links', 'invitations'
  ] loop
    execute format('drop trigger if exists %I on public.%I', 'set_' || v_table || '_updated_at', v_table);
    execute format(
      'create trigger %I before update on public.%I for each row execute function app_private.set_updated_at()',
      'set_' || v_table || '_updated_at',
      v_table
    );
  end loop;
end;
$triggers$;

-- ---------------------------------------------------------------------------
-- 3. Integrity guards for immutable system codes, role scopes and audit log
-- ---------------------------------------------------------------------------

create or replace function app_private.protect_role_definition()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    if old.is_system then
      raise exception 'System role % cannot be deleted; archive or clone it instead.', old.code;
    end if;
    return old;
  end if;

  if old.is_system then
    if new.code is distinct from old.code
       or new.scope_type is distinct from old.scope_type
       or new.is_system is distinct from old.is_system then
      raise exception 'System role code, scope and system flag are immutable for %.', old.code;
    end if;
  end if;

  return new;
end;
$$;

create or replace function app_private.protect_permission_code()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Permission definitions are archived through is_active and cannot be deleted: %.', old.code;
  end if;

  if new.code is distinct from old.code then
    raise exception 'Permission code is immutable after creation: %.', old.code;
  end if;

  return new;
end;
$$;

create or replace function app_private.protect_system_role_permissions()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role_id uuid;
  v_is_system boolean;
begin
  v_role_id := case when tg_op = 'DELETE' then old.role_id else new.role_id end;
  select role.is_system into v_is_system from public.roles role where role.id = v_role_id;

  if coalesce(v_is_system, false)
     and auth.uid() is not null
     and not app_private.has_global_permission('roles.assign_owner') then
    raise exception 'Only Owner can change a system role permission set.';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create or replace function app_private.validate_global_role_assignment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_scope text;
begin
  select scope_type into v_scope from public.roles where id = new.role_id;
  if v_scope is distinct from 'global' then
    raise exception 'user_roles accepts only global roles.';
  end if;
  return new;
end;
$$;

create or replace function app_private.validate_team_role_assignment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_scope text;
begin
  select scope_type into v_scope from public.roles where id = new.role_id;
  if v_scope is distinct from 'team' then
    raise exception 'team_memberships accepts only team roles.';
  end if;
  return new;
end;
$$;

create or replace function app_private.prevent_audit_log_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception 'audit_log is append-only.';
end;
$$;

revoke all on function app_private.protect_role_definition() from public;
revoke all on function app_private.protect_permission_code() from public;
revoke all on function app_private.protect_system_role_permissions() from public;
revoke all on function app_private.validate_global_role_assignment() from public;
revoke all on function app_private.validate_team_role_assignment() from public;
revoke all on function app_private.prevent_audit_log_mutation() from public;

drop trigger if exists protect_role_definition on public.roles;
create trigger protect_role_definition
before update or delete on public.roles
for each row execute function app_private.protect_role_definition();

drop trigger if exists protect_permission_code on public.permissions;
create trigger protect_permission_code
before update or delete on public.permissions
for each row execute function app_private.protect_permission_code();

drop trigger if exists validate_global_role_assignment on public.user_roles;
create trigger validate_global_role_assignment
before insert or update of role_id on public.user_roles
for each row execute function app_private.validate_global_role_assignment();

drop trigger if exists validate_team_role_assignment on public.team_memberships;
create trigger validate_team_role_assignment
before insert or update of role_id on public.team_memberships
for each row execute function app_private.validate_team_role_assignment();

drop trigger if exists prevent_audit_log_update on public.audit_log;
create trigger prevent_audit_log_update
before update or delete on public.audit_log
for each row execute function app_private.prevent_audit_log_mutation();

-- ---------------------------------------------------------------------------
-- 4. Permission catalog and protected system roles
-- ---------------------------------------------------------------------------

insert into public.permissions (code, module, action, scope_type, name, description, is_dangerous)
values
  ('system.settings.read', 'system', 'read', 'global', 'Перегляд системних налаштувань', 'Read non-secret system configuration.', false),
  ('system.settings.update', 'system', 'update', 'global', 'Зміна системних налаштувань', 'Update critical system configuration.', true),
  ('audit.read', 'audit', 'read', 'global', 'Перегляд журналу аудиту', 'Read append-only security and business audit events.', true),

  ('roles.read', 'roles', 'read', 'global', 'Перегляд ролей', 'Read roles and permission matrix.', false),
  ('roles.create', 'roles', 'create', 'global', 'Створення ролей', 'Create custom roles.', true),
  ('roles.update', 'roles', 'update', 'global', 'Редагування ролей', 'Update custom role permission sets.', true),
  ('roles.archive', 'roles', 'archive', 'global', 'Архівування ролей', 'Archive custom roles.', true),
  ('roles.assign_owner', 'roles', 'assign_owner', 'global', 'Призначення Owner', 'Assign or remove the owner role.', true),

  ('users.read', 'users', 'read', 'global', 'Перегляд користувачів', 'Read club user profiles.', false),
  ('users.invite', 'users', 'invite', 'global', 'Запрошення користувачів', 'Create and manage onboarding invitations.', true),
  ('users.update', 'users', 'update', 'global', 'Редагування користувачів', 'Update user profiles and role assignments.', true),
  ('users.suspend', 'users', 'suspend', 'global', 'Призупинення користувачів', 'Suspend active accounts.', true),
  ('users.archive', 'users', 'archive', 'global', 'Архівування користувачів', 'Archive accounts without deleting history.', true),
  ('profiles.read_own', 'profiles', 'read_own', 'own', 'Перегляд власного профілю', 'Read the current user profile.', false),
  ('profiles.update_own', 'profiles', 'update_own', 'own', 'Редагування власного профілю', 'Update explicitly allowed own-profile fields through server APIs.', false),

  ('teams.read', 'teams', 'read', 'team', 'Перегляд команд', 'Read teams available by global or team scope.', false),
  ('teams.create', 'teams', 'create', 'global', 'Створення команд', 'Create a new club team.', true),
  ('teams.update', 'teams', 'update', 'team', 'Редагування команд', 'Update team profile and operational settings.', true),
  ('teams.archive', 'teams', 'archive', 'global', 'Архівування команд', 'Archive a team while preserving history.', true),
  ('team_memberships.read', 'team_memberships', 'read', 'team', 'Перегляд складу та staff', 'Read team roster and access assignments.', false),
  ('team_memberships.manage', 'team_memberships', 'manage', 'team', 'Керування складом та staff', 'Create, update and end team memberships.', true),

  ('players.read', 'players', 'read', 'team', 'Перегляд гравців', 'Read player sports cards by scope.', false),
  ('players.create', 'players', 'create', 'team', 'Створення гравців', 'Create player sports cards.', false),
  ('players.update', 'players', 'update', 'team', 'Редагування гравців', 'Update player sports data.', false),
  ('players.archive', 'players', 'archive', 'team', 'Архівування гравців', 'Archive player cards while preserving history.', true),
  ('players.link_account', 'players', 'link_account', 'team', 'Прив’язка облікового запису', 'Link an existing player card to an Auth profile.', true),
  ('players.read_own', 'players', 'read_own', 'own', 'Перегляд власної картки', 'Read the player card linked to the current profile.', false),
  ('players.read_linked', 'players', 'read_linked', 'linked', 'Перегляд пов’язаного гравця', 'Read player cards linked to a guardian.', false),

  ('exercises.read', 'exercises', 'read', 'team', 'Перегляд бібліотеки вправ', 'Read Exercise Library.', false),
  ('exercises.create', 'exercises', 'create', 'team', 'Створення вправ', 'Create library exercises.', false),
  ('exercises.update', 'exercises', 'update', 'team', 'Редагування вправ', 'Update library exercises.', false),
  ('exercises.archive', 'exercises', 'archive', 'team', 'Архівування вправ', 'Archive exercises.', true),
  ('exercise_media.manage', 'exercise_media', 'manage', 'team', 'Керування медіа вправ', 'Upload, replace and remove exercise media.', true),

  ('training_plans.read', 'training_plans', 'read', 'team', 'Перегляд планів тренувань', 'Read private plans by global/team scope.', false),
  ('training_plans.read_visible', 'training_plans', 'read_visible', 'team', 'Перегляд дозволеної частини плану', 'Read only the player-visible projection of a published plan.', false),
  ('training_plans.create', 'training_plans', 'create', 'team', 'Створення планів тренувань', 'Create training plans.', false),
  ('training_plans.update', 'training_plans', 'update', 'team', 'Редагування планів тренувань', 'Update plan methodology and metadata.', false),
  ('training_plans.publish', 'training_plans', 'publish', 'team', 'Публікація планів тренувань', 'Publish or unpublish plans.', true),
  ('training_plans.cancel', 'training_plans', 'cancel', 'team', 'Скасування планів тренувань', 'Cancel or restore plans.', true),
  ('training_plans.complete', 'training_plans', 'complete', 'team', 'Завершення планів тренувань', 'Complete a plan/session.', true),
  ('training_plans.archive', 'training_plans', 'archive', 'team', 'Архівування планів тренувань', 'Archive or delete allowed plans.', true),

  ('training_templates.read', 'training_templates', 'read', 'team', 'Перегляд шаблонів', 'Read training templates.', false),
  ('training_templates.create', 'training_templates', 'create', 'team', 'Створення шаблонів', 'Create training templates.', false),
  ('training_templates.update', 'training_templates', 'update', 'team', 'Редагування шаблонів', 'Update training templates.', false),
  ('training_templates.archive', 'training_templates', 'archive', 'team', 'Архівування шаблонів', 'Archive templates.', true),

  ('trainings.read', 'trainings', 'read', 'team', 'Перегляд тренувань', 'Read concrete training events.', false),
  ('trainings.create', 'trainings', 'create', 'team', 'Створення тренувань', 'Create training events.', false),
  ('trainings.update', 'trainings', 'update', 'team', 'Редагування тренувань', 'Update date, time, location and team.', false),
  ('trainings.activate', 'trainings', 'activate', 'team', 'Публікація тренування', 'Activate/deactivate a training event.', true),
  ('trainings.cancel', 'trainings', 'cancel', 'team', 'Скасування тренування', 'Cancel or restore a training event.', true),
  ('trainings.complete', 'trainings', 'complete', 'team', 'Завершення тренування', 'Complete a training event.', true),
  ('trainings.delete', 'trainings', 'delete', 'team', 'Видалення тренування', 'Delete an allowed training event.', true),

  ('attendance.read', 'attendance', 'read', 'team', 'Перегляд відвідуваності', 'Read team attendance.', false),
  ('attendance.respond_own', 'attendance', 'respond_own', 'own', 'Власна відповідь на відвідуваність', 'Respond for the current player profile.', false),
  ('attendance.respond_linked', 'attendance', 'respond_linked', 'linked', 'Відповідь за пов’язаного гравця', 'Guardian response for a linked player.', false),
  ('attendance.mark', 'attendance', 'mark', 'team', 'Фактична відмітка відвідуваності', 'Mark actual attendance and coach notes.', false),
  ('attendance.export', 'attendance', 'export', 'team', 'Експорт відвідуваності', 'Export attendance reports.', true),

  ('push.subscribe_own', 'push', 'subscribe_own', 'own', 'Власна Push-підписка', 'Manage the current profile subscription.', false),
  ('push.send_team', 'push', 'send_team', 'team', 'Командні Push-сповіщення', 'Send notifications to one accessible team.', true),
  ('push.send_club', 'push', 'send_club', 'global', 'Клубні Push-сповіщення', 'Send a notification to the entire club.', true),
  ('push.manage_subscriptions', 'push', 'manage_subscriptions', 'global', 'Керування Push-підписками', 'Read/delete subscription endpoints for support.', true),

  ('matches.read', 'matches', 'read', 'team', 'Перегляд матчів', 'Read matches.', false),
  ('matches.create', 'matches', 'create', 'team', 'Створення матчів', 'Create matches.', false),
  ('matches.update', 'matches', 'update', 'team', 'Редагування матчів', 'Update matches and lineups.', false),
  ('matches.complete', 'matches', 'complete', 'team', 'Завершення матчів', 'Complete matches and results.', true),
  ('matches.archive', 'matches', 'archive', 'team', 'Архівування матчів', 'Archive matches.', true),

  ('competitions.read', 'competitions', 'read', 'team', 'Перегляд змагань', 'Read competitions and standings.', false),
  ('competitions.create', 'competitions', 'create', 'team', 'Створення змагань', 'Create competitions.', false),
  ('competitions.update', 'competitions', 'update', 'team', 'Редагування змагань', 'Update competition metadata.', false),
  ('competitions.standings_manage', 'competitions', 'standings_manage', 'team', 'Керування таблицями', 'Manage standings and playoff data.', true),

  ('statistics.read', 'statistics', 'read', 'team', 'Перегляд статистики', 'Read team/player statistics.', false),
  ('statistics.update', 'statistics', 'update', 'team', 'Редагування статистики', 'Update player and match statistics.', false),
  ('statistics.export', 'statistics', 'export', 'team', 'Експорт статистики', 'Export statistics reports.', true),
  ('statistics.read_own', 'statistics', 'read_own', 'own', 'Перегляд власної статистики', 'Read statistics for the linked player.', false),
  ('statistics.read_linked', 'statistics', 'read_linked', 'linked', 'Перегляд статистики пов’язаного гравця', 'Guardian read for linked players.', false),

  ('news.read', 'news', 'read', 'public', 'Перегляд новин', 'Read published news.', false),
  ('news.create', 'news', 'create', 'global', 'Створення новин', 'Create news drafts.', false),
  ('news.update', 'news', 'update', 'global', 'Редагування новин', 'Update news content.', false),
  ('news.publish', 'news', 'publish', 'global', 'Публікація новин', 'Publish/unpublish news.', true),
  ('gallery.read', 'gallery', 'read', 'public', 'Перегляд галереї', 'Read published gallery content.', false),
  ('gallery.manage', 'gallery', 'manage', 'global', 'Керування галереєю', 'Create/edit albums and photos.', true),
  ('media.manage', 'media', 'manage', 'global', 'Керування медіа', 'Upload/delete shared media.', true)
on conflict (code) do update
set module = excluded.module,
    action = excluded.action,
    scope_type = excluded.scope_type,
    name = excluded.name,
    description = excluded.description,
    is_dangerous = excluded.is_dangerous,
    is_active = true,
    updated_at = now();

insert into public.roles (code, name, description, scope_type, is_system, is_active, sort_order)
values
  ('owner', 'Власник системи', 'Повний доступ; захищений останній активний Owner.', 'global', true, true, 10),
  ('administrator', 'Адміністратор', 'Операційне адміністрування без призначення Owner.', 'global', true, true, 20),
  ('club_manager', 'Менеджер клубу', 'Клубні операції, команди, розклад, змагання та комунікації.', 'global', true, true, 30),
  ('content_manager', 'Контент-менеджер', 'Новини, галерея та медіа без security/user management.', 'global', true, true, 40),
  ('statistician', 'Статистик', 'Матчі, результати, таблиці, статистика та експорт.', 'global', true, true, 50),
  ('member', 'Учасник клубу', 'Базовий авторизований профіль; team access надають memberships.', 'global', true, true, 100),
  ('head_coach', 'Головний тренер', 'Повне керування методикою та тренуваннями своєї команди.', 'team', true, true, 10),
  ('assistant_coach', 'Асистент тренера', 'Редагування планів/подій та attendance у своїй команді.', 'team', true, true, 20),
  ('team_manager', 'Менеджер команди', 'Організаційні поля, склад, attendance та повідомлення.', 'team', true, true, 30),
  ('player', 'Гравець', 'Власні дані та доступні події своєї команди.', 'team', true, true, 100),
  ('guardian', 'Батько / опікун', 'Доступ до пов’язаного неповнолітнього гравця.', 'team', true, true, 110)
on conflict (code) do update
set name = excluded.name,
    description = excluded.description,
    is_active = true,
    sort_order = excluded.sort_order,
    updated_at = now();

-- Owner receives every permission.
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.code = 'owner'
on conflict do nothing;

-- Global system role permission sets.
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.code = any (
  case r.code
    when 'administrator' then array[
      'system.settings.read','audit.read','roles.read','roles.create','roles.update','roles.archive',
      'users.read','users.invite','users.update','users.suspend','users.archive',
      'teams.read','teams.create','teams.update','teams.archive','team_memberships.read','team_memberships.manage',
      'players.read','players.create','players.update','players.archive','players.link_account',
      'exercises.read','exercises.create','exercises.update','exercises.archive','exercise_media.manage',
      'training_plans.read','training_plans.create','training_plans.update','training_plans.publish','training_plans.cancel','training_plans.complete','training_plans.archive',
      'training_templates.read','training_templates.create','training_templates.update','training_templates.archive',
      'trainings.read','trainings.create','trainings.update','trainings.activate','trainings.cancel','trainings.complete','trainings.delete',
      'attendance.read','attendance.mark','attendance.export',
      'push.send_team','push.send_club','push.manage_subscriptions',
      'matches.read','matches.create','matches.update','matches.complete','matches.archive',
      'competitions.read','competitions.create','competitions.update','competitions.standings_manage',
      'statistics.read','statistics.update','statistics.export',
      'news.read','news.create','news.update','news.publish','gallery.read','gallery.manage','media.manage'
    ]::text[]
    when 'club_manager' then array[
      'users.read','users.invite','teams.read','teams.create','teams.update','teams.archive',
      'team_memberships.read','team_memberships.manage','players.read','players.create','players.update','players.archive','players.link_account',
      'exercises.read','training_plans.read','training_templates.read',
      'trainings.read','trainings.create','trainings.update','trainings.activate','trainings.cancel','trainings.complete','trainings.delete',
      'attendance.read','attendance.mark','attendance.export',
      'push.send_team','push.send_club',
      'matches.read','matches.create','matches.update','matches.complete','matches.archive',
      'competitions.read','competitions.create','competitions.update','competitions.standings_manage',
      'statistics.read','statistics.update','statistics.export',
      'news.read','news.create','news.update','news.publish','gallery.read','gallery.manage','media.manage','audit.read'
    ]::text[]
    when 'content_manager' then array[
      'teams.read','players.read','exercises.read','news.read','news.create','news.update','news.publish',
      'gallery.read','gallery.manage','media.manage'
    ]::text[]
    when 'statistician' then array[
      'teams.read','team_memberships.read','players.read','exercises.read','training_plans.read','training_templates.read',
      'trainings.read','attendance.read','matches.read','matches.create','matches.update','matches.complete','matches.archive',
      'competitions.read','competitions.create','competitions.update','competitions.standings_manage',
      'statistics.read','statistics.update','statistics.export','news.read','gallery.read'
    ]::text[]
    when 'member' then array[
      'profiles.read_own','profiles.update_own','players.read_own','attendance.respond_own',
      'push.subscribe_own','statistics.read_own','news.read','gallery.read'
    ]::text[]
    else array[]::text[]
  end
)
where r.code in ('administrator','club_manager','content_manager','statistician','member')
on conflict do nothing;

-- Team role permission sets. Effective scope is restricted by team_memberships.team_id.
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.code = any (
  case r.code
    when 'head_coach' then array[
      'teams.read','teams.update','team_memberships.read','team_memberships.manage',
      'players.read','players.create','players.update','players.archive','players.link_account',
      'exercises.read','exercises.create','exercises.update','exercises.archive','exercise_media.manage',
      'training_plans.read','training_plans.create','training_plans.update','training_plans.publish','training_plans.cancel','training_plans.complete','training_plans.archive',
      'training_templates.read','training_templates.create','training_templates.update','training_templates.archive',
      'trainings.read','trainings.create','trainings.update','trainings.activate','trainings.cancel','trainings.complete','trainings.delete',
      'attendance.read','attendance.mark','attendance.export','push.send_team',
      'matches.read','matches.create','matches.update','matches.complete',
      'competitions.read','competitions.update','competitions.standings_manage','statistics.read','statistics.update','statistics.export'
    ]::text[]
    when 'assistant_coach' then array[
      'teams.read','team_memberships.read','players.read','players.update',
      'exercises.read','exercises.create','exercises.update','exercise_media.manage',
      'training_plans.read','training_plans.create','training_plans.update','training_plans.publish','training_plans.cancel','training_plans.complete',
      'training_templates.read','training_templates.create','training_templates.update',
      'trainings.read','trainings.create','trainings.update','trainings.activate','trainings.cancel','trainings.complete',
      'attendance.read','attendance.mark','attendance.export','push.send_team',
      'matches.read','matches.create','matches.update','competitions.read','statistics.read','statistics.update'
    ]::text[]
    when 'team_manager' then array[
      'teams.read','teams.update','team_memberships.read','team_memberships.manage',
      'players.read','players.create','players.update','players.link_account','exercises.read',
      'training_plans.read','training_templates.read',
      'trainings.read','trainings.create','trainings.update','trainings.activate','trainings.cancel','trainings.complete',
      'attendance.read','attendance.mark','attendance.export','push.send_team',
      'matches.read','matches.create','matches.update','competitions.read','statistics.read','statistics.export'
    ]::text[]
    when 'player' then array[
      'teams.read','team_memberships.read','players.read_own','exercises.read','training_plans.read_visible',
      'trainings.read','attendance.respond_own','push.subscribe_own','matches.read','competitions.read','statistics.read_own','news.read','gallery.read'
    ]::text[]
    when 'guardian' then array[
      'teams.read','team_memberships.read','players.read_linked','exercises.read','training_plans.read_visible',
      'trainings.read','attendance.respond_linked','push.subscribe_own','matches.read','competitions.read','statistics.read_linked','news.read','gallery.read'
    ]::text[]
    else array[]::text[]
  end
)
where r.code in ('head_coach','assistant_coach','team_manager','player','guardian')
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- 5. Auth profile bootstrap and automatic profile creation
-- ---------------------------------------------------------------------------

create or replace function app_private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (
    id,
    display_name,
    email_snapshot,
    phone_e164,
    account_status,
    must_change_password
  )
  values (
    new.id,
    coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(btrim(new.raw_user_meta_data ->> 'name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      nullif(new.phone, ''),
      'Користувач'
    ),
    new.email,
    nullif(new.phone, ''),
    case
      when new.email_confirmed_at is not null or new.phone_confirmed_at is not null then 'active'
      else 'invited'
    end,
    case
      when lower(coalesce(new.raw_user_meta_data ->> 'must_change_password', 'false')) in ('1', 'true', 'yes') then true
      else false
    end
  )
  on conflict (id) do update
  set email_snapshot = excluded.email_snapshot,
      phone_e164 = coalesce(excluded.phone_e164, public.profiles.phone_e164),
      updated_at = now();

  return new;
end;
$$;

revoke all on function app_private.handle_new_auth_user() from public;

drop trigger if exists on_auth_user_created_create_profile on auth.users;
create trigger on_auth_user_created_create_profile
after insert on auth.users
for each row execute function app_private.handle_new_auth_user();

insert into public.profiles (
  id,
  display_name,
  email_snapshot,
  phone_e164,
  account_status,
  must_change_password,
  created_at,
  updated_at
)
select
  user_row.id,
  coalesce(
    nullif(btrim(user_row.raw_user_meta_data ->> 'full_name'), ''),
    nullif(btrim(user_row.raw_user_meta_data ->> 'name'), ''),
    nullif(split_part(coalesce(user_row.email, ''), '@', 1), ''),
    nullif(user_row.phone, ''),
    'Користувач'
  ),
  user_row.email,
  nullif(user_row.phone, ''),
  case
    when user_row.email_confirmed_at is not null or user_row.phone_confirmed_at is not null then 'active'
    else 'invited'
  end,
  false,
  coalesce(user_row.created_at, now()),
  now()
from auth.users user_row
on conflict (id) do update
set email_snapshot = excluded.email_snapshot,
    phone_e164 = coalesce(excluded.phone_e164, public.profiles.phone_e164),
    updated_at = now();

-- Owner bootstrap. Set v_initial_owner_id when auth.users contains more than one row.
do $owner_bootstrap$
declare
  v_initial_owner_id uuid := null; -- Optional explicit UUID for multi-user projects.
  v_auth_user_count integer;
  v_owner_role_id uuid;
begin
  select count(*) into v_auth_user_count from auth.users;

  if v_initial_owner_id is null then
    if v_auth_user_count = 1 then
      select id into v_initial_owner_id from auth.users limit 1;
    elsif v_auth_user_count = 0 then
      raise exception 'Sprint 05.3.1 requires an existing Supabase Auth administrator before migration.';
    else
      raise exception 'Found % Auth users. Set v_initial_owner_id explicitly in the migration owner bootstrap block.', v_auth_user_count;
    end if;
  end if;

  if not exists (select 1 from auth.users where id = v_initial_owner_id) then
    raise exception 'Configured initial owner % does not exist in auth.users.', v_initial_owner_id;
  end if;

  select id into v_owner_role_id from public.roles where code = 'owner' and scope_type = 'global';

  update public.profiles
  set account_status = 'active', updated_at = now()
  where id = v_initial_owner_id;

  insert into public.user_roles (profile_id, role_id, assigned_by, is_active)
  values (v_initial_owner_id, v_owner_role_id, v_initial_owner_id, true)
  on conflict (profile_id, role_id) do update
  set is_active = true,
      valid_to = null,
      assigned_by = excluded.assigned_by,
      updated_at = now();
end;
$owner_bootstrap$;

-- ---------------------------------------------------------------------------
-- 6. Permission helpers used by future server APIs and RLS policies
-- ---------------------------------------------------------------------------

create or replace function app_private.current_profile_id()
returns uuid
language sql
stable
security invoker
set search_path = ''
as $$
  select auth.uid();
$$;

create or replace function app_private.is_active_profile()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles profile
    where profile.id = auth.uid()
      and profile.account_status = 'active'
  );
$$;

create or replace function app_private.has_global_permission(p_permission_code text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles profile
    join public.user_roles assignment
      on assignment.profile_id = profile.id
     and assignment.is_active
     and assignment.valid_from <= now()
     and (assignment.valid_to is null or assignment.valid_to > now())
    join public.roles role
      on role.id = assignment.role_id
     and role.scope_type = 'global'
     and role.is_active
    join public.role_permissions role_permission on role_permission.role_id = role.id
    join public.permissions permission
      on permission.id = role_permission.permission_id
     and permission.code = p_permission_code
     and permission.is_active
    where profile.id = auth.uid()
      and profile.account_status = 'active'
  );
$$;

create or replace function app_private.has_team_permission(p_permission_code text, p_team_id uuid)
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
     and membership.team_id = p_team_id
     and membership.status = 'active'
     and membership.valid_from <= current_date
     and (membership.valid_to is null or membership.valid_to >= current_date)
    join public.roles role
      on role.id = membership.role_id
     and role.scope_type = 'team'
     and role.is_active
    join public.role_permissions role_permission on role_permission.role_id = role.id
    join public.permissions permission
      on permission.id = role_permission.permission_id
     and permission.code = p_permission_code
     and permission.is_active
    where profile.id = auth.uid()
      and profile.account_status = 'active'
  );
$$;

create or replace function app_private.is_team_member(p_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles profile
    join public.team_memberships membership on membership.profile_id = profile.id
    where profile.id = auth.uid()
      and profile.account_status = 'active'
      and membership.team_id = p_team_id
      and membership.status = 'active'
      and membership.valid_from <= current_date
      and (membership.valid_to is null or membership.valid_to >= current_date)
  );
$$;

create or replace function app_private.is_player_self(p_player_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles profile
    join public.team_memberships membership on membership.profile_id = profile.id
    where profile.id = auth.uid()
      and profile.account_status = 'active'
      and membership.player_id = p_player_id
      and membership.status = 'active'
      and membership.valid_from <= current_date
      and (membership.valid_to is null or membership.valid_to >= current_date)
  );
$$;

create or replace function app_private.is_guardian_of(p_player_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles profile
    join public.guardian_player_links guardian_link
      on guardian_link.guardian_profile_id = profile.id
    where profile.id = auth.uid()
      and profile.account_status = 'active'
      and guardian_link.player_id = p_player_id
      and guardian_link.is_active
  );
$$;

create or replace function app_private.can_read_team_data(p_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select app_private.has_global_permission('teams.read')
      or app_private.is_team_member(p_team_id);
$$;

create or replace function app_private.can_manage_team_data(p_permission_code text, p_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select app_private.has_team_permission(p_permission_code, p_team_id);
$$;

create or replace function app_private.write_audit_log(
  p_action text,
  p_entity_type text,
  p_entity_id text default null,
  p_team_id uuid default null,
  p_before_data jsonb default null,
  p_after_data jsonb default null,
  p_request_id text default null,
  p_user_agent text default null
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id bigint;
begin
  if auth.uid() is not null and not app_private.is_active_profile() then
    raise exception 'Inactive profile cannot write audit events.';
  end if;

  insert into public.audit_log (
    actor_profile_id,
    action,
    entity_type,
    entity_id,
    team_id,
    before_data,
    after_data,
    request_id,
    user_agent
  )
  values (
    auth.uid(),
    p_action,
    p_entity_type,
    p_entity_id,
    p_team_id,
    p_before_data,
    p_after_data,
    p_request_id,
    p_user_agent
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function app_private.current_profile_id() from public;
revoke all on function app_private.is_active_profile() from public;
revoke all on function app_private.has_global_permission(text) from public;
revoke all on function app_private.has_team_permission(text, uuid) from public;
revoke all on function app_private.is_team_member(uuid) from public;
revoke all on function app_private.is_player_self(uuid) from public;
revoke all on function app_private.is_guardian_of(uuid) from public;
revoke all on function app_private.can_read_team_data(uuid) from public;
revoke all on function app_private.can_manage_team_data(text, uuid) from public;
revoke all on function app_private.write_audit_log(text, text, text, uuid, jsonb, jsonb, text, text) from public;

grant execute on function app_private.current_profile_id() to authenticated, service_role;
grant execute on function app_private.is_active_profile() to authenticated, service_role;
grant execute on function app_private.has_global_permission(text) to authenticated, service_role;
grant execute on function app_private.has_team_permission(text, uuid) to authenticated, service_role;
grant execute on function app_private.is_team_member(uuid) to authenticated, service_role;
grant execute on function app_private.is_player_self(uuid) to authenticated, service_role;
grant execute on function app_private.is_guardian_of(uuid) to authenticated, service_role;
grant execute on function app_private.can_read_team_data(uuid) to authenticated, service_role;
grant execute on function app_private.can_manage_team_data(text, uuid) to authenticated, service_role;
grant execute on function app_private.write_audit_log(text, text, text, uuid, jsonb, jsonb, text, text) to authenticated, service_role;

drop trigger if exists protect_system_role_permissions on public.role_permissions;
create trigger protect_system_role_permissions
before insert or update or delete on public.role_permissions
for each row execute function app_private.protect_system_role_permissions();

-- Last active owner cannot be removed or disabled.
create or replace function app_private.protect_last_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_is_owner boolean;
  v_other_owners integer;
begin
  select role.code = 'owner'
  into v_is_owner
  from public.roles role
  where role.id = old.role_id;

  if not coalesce(v_is_owner, false) or not old.is_active then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE'
     and new.role_id = old.role_id
     and new.is_active
     and new.valid_from <= now()
     and (new.valid_to is null or new.valid_to > now()) then
    return new;
  end if;

  select count(*)
  into v_other_owners
  from public.user_roles assignment
  join public.roles role on role.id = assignment.role_id and role.code = 'owner'
  join public.profiles profile on profile.id = assignment.profile_id and profile.account_status = 'active'
  where assignment.is_active
    and assignment.id <> old.id
    and assignment.valid_from <= now()
    and (assignment.valid_to is null or assignment.valid_to > now());

  if v_other_owners = 0 then
    raise exception 'Cannot remove or deactivate the last active owner.';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create or replace function app_private.protect_owner_assignment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role_code text;
begin
  select code into v_role_code from public.roles where id = new.role_id;

  if v_role_code = 'owner'
     and auth.uid() is not null
     and not app_private.has_global_permission('roles.assign_owner') then
    raise exception 'Only an active owner can assign the owner role.';
  end if;

  return new;
end;
$$;

create or replace function app_private.protect_last_owner_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_is_owner boolean;
  v_other_owners integer;
begin
  if old.account_status <> 'active' or new.account_status = 'active' then
    return new;
  end if;

  select exists (
    select 1
    from public.user_roles assignment
    join public.roles role on role.id = assignment.role_id and role.code = 'owner'
    where assignment.profile_id = old.id
      and assignment.is_active
      and assignment.valid_from <= now()
      and (assignment.valid_to is null or assignment.valid_to > now())
  ) into v_is_owner;

  if not v_is_owner then
    return new;
  end if;

  select count(*)
  into v_other_owners
  from public.user_roles assignment
  join public.roles role on role.id = assignment.role_id and role.code = 'owner'
  join public.profiles profile on profile.id = assignment.profile_id and profile.account_status = 'active'
  where assignment.profile_id <> old.id
    and assignment.is_active
    and assignment.valid_from <= now()
    and (assignment.valid_to is null or assignment.valid_to > now());

  if v_other_owners = 0 then
    raise exception 'Cannot suspend or archive the last active owner profile.';
  end if;

  return new;
end;
$$;

revoke all on function app_private.protect_last_owner() from public;
revoke all on function app_private.protect_owner_assignment() from public;
revoke all on function app_private.protect_last_owner_profile() from public;

drop trigger if exists protect_last_owner on public.user_roles;
create trigger protect_last_owner
before update of role_id, is_active, valid_from, valid_to or delete on public.user_roles
for each row execute function app_private.protect_last_owner();

drop trigger if exists protect_owner_assignment on public.user_roles;
create trigger protect_owner_assignment
before insert or update of role_id on public.user_roles
for each row execute function app_private.protect_owner_assignment();

drop trigger if exists protect_last_owner_profile on public.profiles;
create trigger protect_last_owner_profile
before update of account_status on public.profiles
for each row execute function app_private.protect_last_owner_profile();

-- ---------------------------------------------------------------------------
-- 7. Canonical adult team, legacy team_id compatibility and roster backfill
-- ---------------------------------------------------------------------------

insert into public.teams (
  code,
  name,
  short_name,
  slug,
  category,
  age_group,
  status
)
values (
  'adult',
  'Олімп Футзал',
  'Олімп',
  'olimp-futsal-adult',
  'Доросла команда',
  'Дорослі',
  'active'
)
on conflict (code) do update
set name = excluded.name,
    short_name = excluded.short_name,
    category = excluded.category,
    age_group = excluded.age_group,
    status = 'active',
    archived_at = null,
    updated_at = now();

alter table public.training_plans add column if not exists team_id uuid;
alter table public.trainings add column if not exists team_id uuid;
alter table public.training_templates add column if not exists team_id uuid;
alter table public.training_plan_events add column if not exists team_id uuid;
alter table public.training_attendance add column if not exists responded_by_profile_id uuid;
alter table public.push_subscriptions add column if not exists profile_id uuid;

DO $constraints$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.training_plans'::regclass
      and conname = 'training_plans_team_id_fkey'
  ) then
    alter table public.training_plans
      add constraint training_plans_team_id_fkey
      foreign key (team_id) references public.teams(id) on delete restrict;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.trainings'::regclass
      and conname = 'trainings_team_id_fkey'
  ) then
    alter table public.trainings
      add constraint trainings_team_id_fkey
      foreign key (team_id) references public.teams(id) on delete restrict;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.training_templates'::regclass
      and conname = 'training_templates_team_id_fkey'
  ) then
    alter table public.training_templates
      add constraint training_templates_team_id_fkey
      foreign key (team_id) references public.teams(id) on delete restrict;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.training_plan_events'::regclass
      and conname = 'training_plan_events_team_id_fkey'
  ) then
    alter table public.training_plan_events
      add constraint training_plan_events_team_id_fkey
      foreign key (team_id) references public.teams(id) on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.training_attendance'::regclass
      and conname = 'training_attendance_responded_by_profile_id_fkey'
  ) then
    alter table public.training_attendance
      add constraint training_attendance_responded_by_profile_id_fkey
      foreign key (responded_by_profile_id) references public.profiles(id) on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.push_subscriptions'::regclass
      and conname = 'push_subscriptions_profile_id_fkey'
  ) then
    alter table public.push_subscriptions
      add constraint push_subscriptions_profile_id_fkey
      foreign key (profile_id) references public.profiles(id) on delete set null;
  end if;
end;
$constraints$;

create index if not exists training_plans_team_status_session_idx
  on public.training_plans (team_id, status, session_date);
create index if not exists trainings_team_starts_status_idx
  on public.trainings (team_id, starts_at, status);
create index if not exists training_templates_team_status_idx
  on public.training_templates (team_id, status);
create index if not exists training_plan_events_team_created_idx
  on public.training_plan_events (team_id, created_at desc);
create index if not exists training_attendance_responded_by_profile_idx
  on public.training_attendance (responded_by_profile_id);
create index if not exists push_subscriptions_profile_idx
  on public.push_subscriptions (profile_id);

create or replace function app_private.resolve_team_id(p_team_name text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select team.id
  from public.teams team
  where team.status <> 'archived'
    and (
      lower(btrim(team.name)) = lower(btrim(p_team_name))
      or lower(btrim(team.short_name)) = lower(btrim(p_team_name))
      or lower(btrim(team.code)) = lower(btrim(p_team_name))
      or (
        team.code = 'adult'
        and lower(btrim(p_team_name)) in (
          lower('Дорослі'),
          lower('Доросла команда')
        )
      )
    )
  order by case when team.code = 'adult' then 0 else 1 end, team.created_at
  limit 1;
$$;

create or replace function app_private.sync_legacy_team_reference()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_team_name text;
begin
  v_team_name := nullif(btrim(new.team_name), '');

  if new.team_id is null and v_team_name is not null then
    new.team_id := app_private.resolve_team_id(v_team_name);
  end if;

  if new.team_id is not null and v_team_name is null then
    select team.name into new.team_name
    from public.teams team
    where team.id = new.team_id;
  end if;

  if new.team_id is not null and v_team_name is not null then
    if not exists (
      select 1 from public.teams team
      where team.id = new.team_id
        and team.status <> 'archived'
    ) then
      raise exception 'Unknown or archived team_id: %', new.team_id;
    end if;
  end if;

  return new;
end;
$$;

revoke all on function app_private.resolve_team_id(text) from public;
revoke all on function app_private.sync_legacy_team_reference() from public;
grant execute on function app_private.resolve_team_id(text) to authenticated, service_role;

DO $legacy_triggers$
declare
  v_table text;
begin
  foreach v_table in array array['training_plans', 'trainings', 'training_templates'] loop
    execute format('drop trigger if exists sync_legacy_team_reference on public.%I', v_table);
    execute format(
      'create trigger sync_legacy_team_reference before insert or update of team_id, team_name on public.%I for each row execute function app_private.sync_legacy_team_reference()',
      v_table
    );
  end loop;
end;
$legacy_triggers$;

update public.training_plans plan
set team_id = team.id
from public.teams team
where team.code = 'adult'
  and plan.team_id is null
  and app_private.resolve_team_id(plan.team_name) = team.id;

update public.trainings training
set team_id = team.id
from public.teams team
where team.code = 'adult'
  and training.team_id is null
  and app_private.resolve_team_id(training.team_name) = team.id;

update public.training_templates template
set team_id = team.id
from public.teams team
where team.code = 'adult'
  and template.team_id is null
  and app_private.resolve_team_id(template.team_name) = team.id;

update public.training_plan_events event
set team_id = plan.team_id
from public.training_plans plan
where event.training_plan_id = plan.id
  and event.team_id is null
  and plan.team_id is not null;

insert into public.team_memberships (
  team_id,
  player_id,
  role_id,
  status,
  valid_from,
  shirt_number,
  is_primary,
  notes
)
select
  team.id,
  player.id,
  role.id,
  'active',
  current_date,
  player.shirt_number,
  true,
  'Initial adult-team roster backfill — Sprint 05.3.1'
from public.players player
cross join public.teams team
cross join public.roles role
where team.code = 'adult'
  and role.code = 'player'
  and role.scope_type = 'team'
on conflict (team_id, player_id, role_id) do update
set status = excluded.status,
    shirt_number = excluded.shirt_number,
    is_primary = true,
    archived_at = null,
    updated_at = now();

-- ---------------------------------------------------------------------------
-- 8. Atomic service-role-only import for private contact preparation
-- ---------------------------------------------------------------------------

create or replace function public.apply_player_contact_foundation_import(p_rows jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item jsonb;
  v_team_id uuid;
  v_player_role_id uuid;
  v_player_id uuid;
  v_phone text;
  v_contact_count integer := 0;
  v_membership_count integer := 0;
begin
  if jsonb_typeof(p_rows) <> 'array' then
    raise exception 'p_rows must be a JSON array.';
  end if;

  select id into v_team_id from public.teams where code = 'adult' and status = 'active';
  select id into v_player_role_id from public.roles where code = 'player' and scope_type = 'team' and is_active;

  if v_team_id is null or v_player_role_id is null then
    raise exception 'Adult team or player role foundation is missing.';
  end if;

  for v_item in select value from jsonb_array_elements(p_rows) loop
    v_player_id := nullif(v_item ->> 'player_id', '')::uuid;
    v_phone := nullif(btrim(v_item ->> 'phone_e164'), '');

    if v_player_id is null or not exists (select 1 from public.players where id = v_player_id) then
      raise exception 'Unknown player_id in contact import: %', v_item ->> 'player_id';
    end if;

    if v_phone is null or v_phone !~ '^\+[1-9][0-9]{7,14}$' then
      raise exception 'Invalid E.164 phone for player %.', v_player_id;
    end if;

    if coalesce((v_item ->> 'can_be_used_for_login')::boolean, false)
       and not coalesce((v_item ->> 'verified_by_club')::boolean, false) then
      raise exception 'Login phone must be club-verified for player %.', v_player_id;
    end if;

    insert into public.player_contacts (
      player_id,
      phone_e164,
      contact_owner,
      owner_name,
      is_primary,
      is_verified_by_club,
      verified_at,
      can_be_used_for_login,
      can_receive_notifications,
      account_requested,
      provisioning_status,
      is_active,
      notes
    )
    values (
      v_player_id,
      v_phone,
      coalesce(nullif(v_item ->> 'phone_owner', ''), 'player'),
      nullif(v_item ->> 'owner_name', ''),
      true,
      coalesce((v_item ->> 'verified_by_club')::boolean, false),
      case when coalesce((v_item ->> 'verified_by_club')::boolean, false) then now() else null end,
      coalesce((v_item ->> 'can_be_used_for_login')::boolean, false),
      true,
      coalesce((v_item ->> 'create_account')::boolean, false),
      case when coalesce((v_item ->> 'create_account')::boolean, false) then 'prepared' else 'not_requested' end,
      true,
      nullif(v_item ->> 'notes', '')
    )
    on conflict (player_id, phone_e164) do update
    set contact_owner = excluded.contact_owner,
        owner_name = excluded.owner_name,
        is_primary = true,
        is_verified_by_club = excluded.is_verified_by_club,
        verified_at = excluded.verified_at,
        can_be_used_for_login = excluded.can_be_used_for_login,
        can_receive_notifications = excluded.can_receive_notifications,
        account_requested = excluded.account_requested,
        provisioning_status = case
          when public.player_contacts.provisioning_status = 'provisioned' then 'provisioned'
          else excluded.provisioning_status
        end,
        is_active = true,
        notes = excluded.notes,
        archived_at = null,
        updated_at = now();

    v_contact_count := v_contact_count + 1;

    insert into public.team_memberships (
      team_id,
      player_id,
      role_id,
      status,
      valid_from,
      shirt_number,
      is_primary,
      notes
    )
    values (
      v_team_id,
      v_player_id,
      v_player_role_id,
      'active',
      current_date,
      nullif(v_item ->> 'shirt_number', '')::integer,
      true,
      'Private roster/contact import — Sprint 05.3.1'
    )
    on conflict (team_id, player_id, role_id) do update
    set status = excluded.status,
        shirt_number = excluded.shirt_number,
        is_primary = true,
        notes = excluded.notes,
        archived_at = null,
        updated_at = now();

    v_membership_count := v_membership_count + 1;
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
    auth.uid(),
    'player_contacts.foundation_import',
    'team',
    v_team_id::text,
    v_team_id,
    jsonb_build_object(
      'rows', v_contact_count,
      'memberships_updated', v_membership_count,
      'phone_values_logged', false,
      'auth_accounts_created', false
    )
  );

  return jsonb_build_object(
    'contacts_upserted', v_contact_count,
    'memberships_upserted', v_membership_count,
    'auth_accounts_created', 0,
    'team_id', v_team_id
  );
end;
$$;

revoke all on function public.apply_player_contact_foundation_import(jsonb) from public, anon, authenticated;
grant execute on function public.apply_player_contact_foundation_import(jsonb) to service_role;

-- ---------------------------------------------------------------------------
-- 9. RLS for new foundation tables (legacy module policies remain unchanged)
-- ---------------------------------------------------------------------------

alter table public.teams enable row level security;
alter table public.profiles enable row level security;
alter table public.permissions enable row level security;
alter table public.roles enable row level security;
alter table public.role_permissions enable row level security;
alter table public.user_roles enable row level security;
alter table public.team_memberships enable row level security;
alter table public.player_contacts enable row level security;
alter table public.guardian_player_links enable row level security;
alter table public.invitations enable row level security;
alter table public.audit_log enable row level security;

revoke all on public.teams, public.profiles, public.permissions, public.roles,
  public.role_permissions, public.user_roles, public.team_memberships,
  public.player_contacts, public.guardian_player_links, public.invitations,
  public.audit_log from anon;

grant select, insert, update, delete on public.teams to authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.permissions to authenticated;
grant select, insert, update, delete on public.roles to authenticated;
grant select, insert, update, delete on public.role_permissions to authenticated;
grant select, insert, update, delete on public.user_roles to authenticated;
grant select, insert, update, delete on public.team_memberships to authenticated;
grant select, insert, update, delete on public.player_contacts to authenticated;
grant select, insert, update, delete on public.guardian_player_links to authenticated;
grant select, insert, update, delete on public.invitations to authenticated;
grant select on public.audit_log to authenticated;
grant usage, select on sequence public.audit_log_id_seq to authenticated, service_role;

-- Profiles
DROP POLICY IF EXISTS "Foundation profiles read" ON public.profiles;
CREATE POLICY "Foundation profiles read" ON public.profiles
FOR SELECT TO authenticated
USING (
  app_private.is_active_profile()
  and (id = auth.uid() or app_private.has_global_permission('users.read'))
);

DROP POLICY IF EXISTS "Foundation profiles insert" ON public.profiles;
CREATE POLICY "Foundation profiles insert" ON public.profiles
FOR INSERT TO authenticated
WITH CHECK (app_private.has_global_permission('users.update'));

DROP POLICY IF EXISTS "Foundation profiles update" ON public.profiles;
CREATE POLICY "Foundation profiles update" ON public.profiles
FOR UPDATE TO authenticated
USING (app_private.has_global_permission('users.update'))
WITH CHECK (app_private.has_global_permission('users.update'));

DROP POLICY IF EXISTS "Foundation profiles delete" ON public.profiles;
CREATE POLICY "Foundation profiles delete" ON public.profiles
FOR DELETE TO authenticated
USING (app_private.has_global_permission('users.archive'));

-- Teams
DROP POLICY IF EXISTS "Foundation teams read" ON public.teams;
CREATE POLICY "Foundation teams read" ON public.teams
FOR SELECT TO authenticated
USING (
  app_private.is_active_profile()
  and (app_private.has_global_permission('teams.read') or app_private.is_team_member(id))
);

DROP POLICY IF EXISTS "Foundation teams create" ON public.teams;
CREATE POLICY "Foundation teams create" ON public.teams
FOR INSERT TO authenticated
WITH CHECK (app_private.has_global_permission('teams.create'));

DROP POLICY IF EXISTS "Foundation teams update" ON public.teams;
CREATE POLICY "Foundation teams update" ON public.teams
FOR UPDATE TO authenticated
USING (app_private.has_team_permission('teams.update', id))
WITH CHECK (app_private.has_team_permission('teams.update', id));

DROP POLICY IF EXISTS "Foundation teams delete" ON public.teams;
CREATE POLICY "Foundation teams delete" ON public.teams
FOR DELETE TO authenticated
USING (false);

-- Roles and permissions
DROP POLICY IF EXISTS "Foundation permissions read" ON public.permissions;
CREATE POLICY "Foundation permissions read" ON public.permissions
FOR SELECT TO authenticated
USING (app_private.has_global_permission('roles.read'));

DROP POLICY IF EXISTS "Foundation permissions manage" ON public.permissions;
CREATE POLICY "Foundation permissions manage" ON public.permissions
FOR ALL TO authenticated
USING (app_private.has_global_permission('roles.update'))
WITH CHECK (app_private.has_global_permission('roles.update'));

DROP POLICY IF EXISTS "Foundation roles read" ON public.roles;
CREATE POLICY "Foundation roles read" ON public.roles
FOR SELECT TO authenticated
USING (app_private.has_global_permission('roles.read'));

DROP POLICY IF EXISTS "Foundation roles create" ON public.roles;
CREATE POLICY "Foundation roles create" ON public.roles
FOR INSERT TO authenticated
WITH CHECK (app_private.has_global_permission('roles.create'));

DROP POLICY IF EXISTS "Foundation roles update" ON public.roles;
CREATE POLICY "Foundation roles update" ON public.roles
FOR UPDATE TO authenticated
USING (app_private.has_global_permission('roles.update'))
WITH CHECK (app_private.has_global_permission('roles.update'));

DROP POLICY IF EXISTS "Foundation roles delete" ON public.roles;
CREATE POLICY "Foundation roles delete" ON public.roles
FOR DELETE TO authenticated
USING (app_private.has_global_permission('roles.archive'));

DROP POLICY IF EXISTS "Foundation role permissions read" ON public.role_permissions;
CREATE POLICY "Foundation role permissions read" ON public.role_permissions
FOR SELECT TO authenticated
USING (app_private.has_global_permission('roles.read'));

DROP POLICY IF EXISTS "Foundation role permissions manage" ON public.role_permissions;
CREATE POLICY "Foundation role permissions manage" ON public.role_permissions
FOR ALL TO authenticated
USING (app_private.has_global_permission('roles.update'))
WITH CHECK (app_private.has_global_permission('roles.update'));

-- Global assignments
DROP POLICY IF EXISTS "Foundation user roles read" ON public.user_roles;
CREATE POLICY "Foundation user roles read" ON public.user_roles
FOR SELECT TO authenticated
USING (
  app_private.is_active_profile()
  and (profile_id = auth.uid() or app_private.has_global_permission('roles.read') or app_private.has_global_permission('users.read'))
);

DROP POLICY IF EXISTS "Foundation user roles manage" ON public.user_roles;
CREATE POLICY "Foundation user roles manage" ON public.user_roles
FOR ALL TO authenticated
USING (app_private.has_global_permission('roles.update'))
WITH CHECK (app_private.has_global_permission('roles.update'));

-- Team memberships
DROP POLICY IF EXISTS "Foundation team memberships read" ON public.team_memberships;
CREATE POLICY "Foundation team memberships read" ON public.team_memberships
FOR SELECT TO authenticated
USING (
  app_private.is_active_profile()
  and (
    profile_id = auth.uid()
    or app_private.has_global_permission('team_memberships.read')
    or app_private.is_team_member(team_id)
  )
);

DROP POLICY IF EXISTS "Foundation team memberships manage" ON public.team_memberships;
CREATE POLICY "Foundation team memberships manage" ON public.team_memberships
FOR ALL TO authenticated
USING (app_private.has_team_permission('team_memberships.manage', team_id))
WITH CHECK (app_private.has_team_permission('team_memberships.manage', team_id));

-- Player contacts and guardian links
DROP POLICY IF EXISTS "Foundation player contacts read" ON public.player_contacts;
CREATE POLICY "Foundation player contacts read" ON public.player_contacts
FOR SELECT TO authenticated
USING (
  app_private.is_active_profile()
  and (
    app_private.has_global_permission('players.read')
    or app_private.is_player_self(player_id)
    or app_private.is_guardian_of(player_id)
  )
);

DROP POLICY IF EXISTS "Foundation player contacts manage" ON public.player_contacts;
CREATE POLICY "Foundation player contacts manage" ON public.player_contacts
FOR ALL TO authenticated
USING (app_private.has_global_permission('players.link_account'))
WITH CHECK (app_private.has_global_permission('players.link_account'));

DROP POLICY IF EXISTS "Foundation guardian links read" ON public.guardian_player_links;
CREATE POLICY "Foundation guardian links read" ON public.guardian_player_links
FOR SELECT TO authenticated
USING (
  app_private.is_active_profile()
  and (
    guardian_profile_id = auth.uid()
    or app_private.has_global_permission('players.read')
  )
);

DROP POLICY IF EXISTS "Foundation guardian links manage" ON public.guardian_player_links;
CREATE POLICY "Foundation guardian links manage" ON public.guardian_player_links
FOR ALL TO authenticated
USING (app_private.has_global_permission('players.link_account'))
WITH CHECK (app_private.has_global_permission('players.link_account'));

-- Invitations
DROP POLICY IF EXISTS "Foundation invitations read" ON public.invitations;
CREATE POLICY "Foundation invitations read" ON public.invitations
FOR SELECT TO authenticated
USING (app_private.has_global_permission('users.invite'));

DROP POLICY IF EXISTS "Foundation invitations manage" ON public.invitations;
CREATE POLICY "Foundation invitations manage" ON public.invitations
FOR ALL TO authenticated
USING (app_private.has_global_permission('users.invite'))
WITH CHECK (app_private.has_global_permission('users.invite'));

-- Audit is read-only through the Data API.
DROP POLICY IF EXISTS "Foundation audit read" ON public.audit_log;
CREATE POLICY "Foundation audit read" ON public.audit_log
FOR SELECT TO authenticated
USING (app_private.has_global_permission('audit.read'));

-- ---------------------------------------------------------------------------
-- 10. Compatibility view and migration audit record
-- ---------------------------------------------------------------------------

create or replace view public.current_team_roster
with (security_invoker = true)
as
select
  membership.id as membership_id,
  membership.team_id,
  team.code as team_code,
  team.name as team_name,
  membership.profile_id,
  membership.player_id,
  player.full_name as player_full_name,
  player.display_name as player_display_name,
  membership.shirt_number,
  player.position,
  membership.status,
  role.code as role_code,
  role.name as role_name,
  membership.is_primary,
  membership.valid_from,
  membership.valid_to,
  player.is_active as player_is_active
from public.team_memberships membership
join public.teams team on team.id = membership.team_id
join public.roles role on role.id = membership.role_id
left join public.players player on player.id = membership.player_id
where membership.status in ('active', 'inactive')
  and membership.archived_at is null;

revoke all on public.current_team_roster from anon;
grant select on public.current_team_roster to authenticated;

insert into public.audit_log (
  actor_profile_id,
  action,
  entity_type,
  entity_id,
  team_id,
  after_data
)
select
  owner_assignment.profile_id,
  'database.foundation_applied',
  'release',
  '0.6.0-alpha.2',
  team.id,
  jsonb_build_object(
    'sprint', '05.3.1',
    'team_code', team.code,
    'auth_accounts_created', false,
    'legacy_policies_changed', false,
    'players_backfilled', (select count(*) from public.players),
    'roles_seeded', (select count(*) from public.roles where is_system),
    'permissions_seeded', (select count(*) from public.permissions where is_active)
  )
from public.user_roles owner_assignment
join public.roles owner_role on owner_role.id = owner_assignment.role_id and owner_role.code = 'owner'
cross join public.teams team
where owner_assignment.is_active
  and team.code = 'adult'
  and not exists (
    select 1
    from public.audit_log existing_audit
    where existing_audit.action = 'database.foundation_applied'
      and existing_audit.entity_id = '0.6.0-alpha.2'
  )
order by owner_assignment.created_at
limit 1;

commit;

-- Post-migration quick checks (read-only):
-- select * from public.teams where code = 'adult';
-- select code, scope_type, is_system, is_active from public.roles order by scope_type, sort_order;
-- select count(*) from public.permissions;
-- select count(*) from public.current_team_roster where team_code = 'adult';
-- select count(*) from public.training_plans where team_name = 'Олімп Футзал' and team_id is null;
-- select count(*) from public.trainings where team_name = 'Олімп Футзал' and team_id is null;
