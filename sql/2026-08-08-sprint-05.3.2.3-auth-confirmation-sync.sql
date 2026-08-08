-- Sprint 05.3.2.3 — Auth Confirmation Sync
-- Purpose:
--   1) keep strict E.164 normalization from 05.3.2.2;
--   2) create profile on auth.users INSERT;
--   3) promote profile account_status invited -> active when
--      email_confirmed_at or phone_confirmed_at is populated later.
--
-- Existing suspended/archived profiles are NEVER reactivated by this trigger.

begin;

create or replace function app_private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_phone_raw text;
  v_phone_e164 text;
  v_auth_status text;
begin
  v_phone_raw := nullif(btrim(new.phone), '');

  if v_phone_raw is null then
    v_phone_e164 := null;
  elsif v_phone_raw ~ '^\+[1-9][0-9]{7,14}$' then
    v_phone_e164 := v_phone_raw;
  elsif v_phone_raw ~ '^[1-9][0-9]{7,14}$' then
    v_phone_e164 := '+' || v_phone_raw;
  else
    raise exception
      'Unsupported auth.users.phone format for profile snapshot'
      using errcode = '22023';
  end if;

  v_auth_status := case
    when new.email_confirmed_at is not null
      or new.phone_confirmed_at is not null
    then 'active'
    else 'invited'
  end;

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
      v_phone_e164,
      'Користувач'
    ),
    new.email,
    v_phone_e164,
    v_auth_status,
    case
      when lower(
        coalesce(new.raw_user_meta_data ->> 'must_change_password', 'false')
      ) in ('1', 'true', 'yes')
      then true
      else false
    end
  )
  on conflict (id) do update
  set email_snapshot = excluded.email_snapshot,
      phone_e164 = coalesce(
        excluded.phone_e164,
        public.profiles.phone_e164
      ),
      account_status = case
        when public.profiles.account_status = 'invited'
          and excluded.account_status = 'active'
        then 'active'
        else public.profiles.account_status
      end,
      updated_at = now();

  return new;
end;
$function$;

drop trigger if exists on_auth_user_created_create_profile on auth.users;

create trigger on_auth_user_created_create_profile
after insert on auth.users
for each row
execute function app_private.handle_new_auth_user();

drop trigger if exists on_auth_user_confirmed_sync_profile on auth.users;

create trigger on_auth_user_confirmed_sync_profile
after update of email_confirmed_at, phone_confirmed_at on auth.users
for each row
when (
  (
    old.email_confirmed_at is null
    and new.email_confirmed_at is not null
  )
  or
  (
    old.phone_confirmed_at is null
    and new.phone_confirmed_at is not null
  )
)
execute function app_private.handle_new_auth_user();

commit;
