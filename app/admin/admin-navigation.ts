export type AdminNavigationItem = {
  href: string;
  label: string;
  icon: string;
};

export type AdminNavigationSection = {
  id: string;
  label?: string;
  icon?: string;
  items: AdminNavigationItem[];
};

export const adminNavigationSections: AdminNavigationSection[] = [
  {
    id: "overview",
    items: [{ href: "/admin", label: "Огляд клубу", icon: "⌂" }],
  },
  {
    id: "coach-workspace",
    label: "Робочий простір тренера",
    icon: "🧭",
    items: [
      { href: "/admin/coach", label: "Огляд тренера", icon: "⌂" },
      { href: "/admin/trainings", label: "Тренування", icon: "📅" },
      {
        href: "/admin/coach/training-plans",
        label: "Плани тренувань",
        icon: "🗂️",
      },
      {
        href: "/admin/coach/exercises",
        label: "Бібліотека вправ",
        icon: "🏃",
      },
      {
        href: "/admin/coach/exercises/import",
        label: "Імпорт вправ",
        icon: "⇧",
      },
      {
        href: "/admin/coach/exercises/media-import",
        label: "Імпорт медіа",
        icon: "🖼️",
      },
    ],
  },
  {
    id: "team",
    label: "Команда",
    icon: "👥",
    items: [
      { href: "/admin/matches", label: "Матчі", icon: "⚽" },
      { href: "/admin/players", label: "Гравці", icon: "👥" },
      {
        href: "/admin/attendance",
        label: "Відвідуваність",
        icon: "📊",
      },
      {
        href: "/admin/statistics",
        label: "Статистика",
        icon: "📈",
      },
      {
        href: "/admin/competitions",
        label: "Змагання",
        icon: "🏆",
      },
    ],
  },
  {
    id: "communications",
    label: "Комунікації",
    icon: "💬",
    items: [
      {
        href: "/admin/push",
        label: "Push-сповіщення",
        icon: "📢",
      },
      { href: "/admin/news", label: "Новини", icon: "📝" },
      { href: "/admin/gallery", label: "Галерея", icon: "🖼️" },
    ],
  },
  {
    id: "system",
    label: "Система",
    icon: "⚙️",
    items: [
      {
        href: "/admin/settings",
        label: "Налаштування",
        icon: "⚙️",
      },
    ],
  },
];

export function getActiveAdminNavigationHref(pathname: string) {
  const matchingItems = adminNavigationSections
    .flatMap((section) => section.items)
    .filter((item) => {
      if (item.href === "/admin") {
        return pathname === "/admin";
      }

      return pathname === item.href || pathname.startsWith(`${item.href}/`);
    })
    .sort((first, second) => second.href.length - first.href.length);

  return matchingItems[0]?.href ?? null;
}
