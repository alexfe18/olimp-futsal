import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Робочий простір тренера",
};

const workspaceModules = [
  {
    href: "/admin/trainings",
    icon: "📅",
    title: "Тренування",
    description:
      "Керуйте розкладом занять, активною подією та організаційною інформацією.",
    action: "Відкрити тренування",
  },
  {
    href: "/admin/coach/training-plans",
    icon: "🗂️",
    title: "Плани тренувань",
    description:
      "Створюйте чернетки сесій, додавайте вправи з бібліотеки та керуйте їх порядком і тривалістю.",
    action: "Відкрити плани",
  },
  {
    href: "/admin/coach/training-templates",
    icon: "📚",
    title: "Шаблони тренувань",
    description:
      "Зберігайте повторювані структури сесій та створюйте з них незалежні плани.",
    action: "Відкрити шаблони",
  },
  {
    href: "/admin/coach/exercises",
    icon: "🏃",
    title: "Бібліотека вправ",
    description:
      "Переглядайте, створюйте, редагуйте та систематизуйте вправи тренера.",
    action: "Відкрити бібліотеку",
  },
  {
    href: "/admin/coach/exercises/import",
    icon: "⇧",
    title: "Імпорт вправ",
    description:
      "Завантажуйте професійні JSON/CSV контент-паки з перевіркою та preview.",
    action: "Перейти до імпорту",
  },
  {
    href: "/admin/coach/exercises/media-import",
    icon: "🖼️",
    title: "Імпорт медіа",
    description:
      "Додавайте обкладинки та схеми пакетами з preview і безпечною заміною.",
    action: "Імпортувати медіа",
  },
];

export default function CoachWorkspacePage() {
  return (
    <div>
      <header className="overflow-hidden rounded-[2rem] bg-slate-950 p-6 text-white shadow-xl sm:p-8 lg:p-10">
        <p className="text-xs font-black uppercase tracking-[0.28em] text-sky-400">
          Олімп Футзал
        </p>

        <div className="mt-4 flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-black sm:text-4xl lg:text-5xl">
              Робочий простір тренера
            </h1>

            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300 sm:text-lg">
              Єдина точка входу до тренувань, планів занять, бібліотеки вправ і
              професійних контент-паків.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin/coach/exercises/create"
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-sky-400 px-6 py-3 font-black text-slate-950 transition hover:-translate-y-0.5 hover:bg-sky-300"
            >
              + Створити вправу
            </Link>

            <Link
              href="/admin/coach/exercises/import"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/15 px-6 py-3 font-black transition hover:border-sky-400 hover:text-sky-300"
            >
              Імпортувати вправи
            </Link>
          </div>
        </div>
      </header>

      <section className="mt-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-700">
              Модулі тренера
            </p>
            <h2 className="mt-2 text-2xl font-black text-slate-950 sm:text-3xl">
              Усе необхідне для підготовки команди
            </h2>
          </div>

          <p className="max-w-xl text-sm leading-6 text-slate-500">
            Навігація зібрана за робочими сценаріями, а швидкі дії залишаються
            доступними всередині кожного модуля.
          </p>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {workspaceModules.map((module) => (
            <article
              key={module.href}
              className="flex min-h-[18rem] flex-col rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-sky-300 hover:shadow-lg"
            >
              <span
                aria-hidden="true"
                className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-xl"
              >
                {module.icon}
              </span>

              <h3 className="mt-6 text-xl font-black text-slate-950">
                {module.title}
              </h3>

              <p className="mt-3 flex-1 text-sm leading-6 text-slate-600">
                {module.description}
              </p>

              <Link
                href={module.href}
                className="mt-6 inline-flex items-center gap-2 text-sm font-black text-sky-700 transition hover:text-sky-500"
              >
                {module.action}
                <span aria-hidden="true">→</span>
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-8 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <article className="rounded-[1.75rem] border border-sky-200 bg-sky-50 p-6 sm:p-7">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-sky-700">
            Поточний пріоритет
          </p>

          <h2 className="mt-3 text-2xl font-black text-slate-950">
            Основа конструктора тренувань
          </h2>

          <p className="mt-3 max-w-2xl leading-7 text-slate-700">
            Бібліотеку вправ підключено до конструктора тренувань. Плани можна
            дублювати, зберігати як шаблони та створювати з них незалежні сесії.
          </p>

          <Link
            href="/admin/coach/training-plans/new"
            className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full bg-slate-950 px-5 py-2.5 text-sm font-black text-white transition hover:bg-slate-800"
          >
            Створити тренування
          </Link>
        </article>

        <article className="rounded-[1.75rem] border border-slate-200 bg-white p-6 sm:p-7">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
            Далі за roadmap
          </p>

          <h2 className="mt-3 text-2xl font-black text-slate-950">
            Наступний функціональний етап
          </h2>

          <p className="mt-3 leading-7 text-slate-600">
            Після шаблонів переходимо до публікації плану, review проведеного
            тренування та роботи з мікроциклами.
          </p>
        </article>
      </section>
    </div>
  );
}
