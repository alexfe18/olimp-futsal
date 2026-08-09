export type PlayerAccessContext = {
  profile_id: string;
  display_name: string;
  account_status: "invited" | "active" | "suspended" | "archived";
  must_change_password: boolean;
  locale: string;
  last_seen_at: string | null;
  global_roles: string[];
  team_roles: string[];
  can_access_admin: boolean;
  player: {
    id: string;
    full_name: string | null;
    sporting_is_active: boolean | null;
  } | null;
  team: {
    id: string;
    code: string;
    name: string;
    membership_status: string;
  } | null;
};

export function normalizeUkrainianLoginPhone(value: string) {
  const digits = value.replace(/\D/g, "");

  if (/^380\d{9}$/.test(digits)) {
    return `+${digits}`;
  }

  if (/^0\d{9}$/.test(digits)) {
    return `+38${digits}`;
  }

  return null;
}

export function validateNewPassword(value: string) {
  if (value.length < 10) {
    return "Пароль має містити щонайменше 10 символів.";
  }

  if (!/[a-zа-яіїєґ]/i.test(value) || !/\d/.test(value)) {
    return "Додайте до пароля літери та цифри.";
  }

  return null;
}
