"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";

import { supabase } from "@/lib/supabase";

type AlbumStatus = "draft" | "published";

type CompetitionRow = {
  id: string;
  name: string;
  season: string | null;
};

type MatchRow = {
  id: string;
  competition_id: string | null;
  opponent_id: string | null;
  starts_at: string | null;
  match_date: string | null;
  olimp_score: number | null;
  opponent_score: number | null;
};

type OpponentRow = {
  id: string;
  name: string;
};

type NewsRow = {
  id: string;
  title: string;
  status: "draft" | "published";
};

type AlbumFormState = {
  title: string;
  slug: string;
  description: string;
  eventDate: string;
  season: string;
  competitionId: string;
  matchId: string;
  newsId: string;
  status: AlbumStatus;
  isFeatured: boolean;
};

const INITIAL_FORM: AlbumFormState = {
  title: "",
  slug: "",
  description: "",
  eventDate: "",
  season: "",
  competitionId: "",
  matchId: "",
  newsId: "",
  status: "draft",
  isFeatured: false,
};

function createSlug(value: string) {
  const map: Record<string, string> = {
    а: "a",
    б: "b",
    в: "v",
    г: "h",
    ґ: "g",
    д: "d",
    е: "e",
    є: "ie",
    ж: "zh",
    з: "z",
    и: "y",
    і: "i",
    ї: "i",
    й: "i",
    к: "k",
    л: "l",
    м: "m",
    н: "n",
    о: "o",
    п: "p",
    р: "r",
    с: "s",
    т: "t",
    у: "u",
    ф: "f",
    х: "kh",
    ц: "ts",
    ч: "ch",
    ш: "sh",
    щ: "shch",
    ь: "",
    ю: "iu",
    я: "ia",
  };

  return value
    .toLocaleLowerCase("uk-UA")
    .split("")
    .map((character) => map[character] ?? character)
    .join("")
    .replace(/[«»"'’`]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function formatMatchDate(match: MatchRow) {
  const rawDate = match.starts_at ?? match.match_date;

  if (!rawDate) {
    return "Дата не вказана";
  }

  return new Intl.DateTimeFormat("uk-UA", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: match.starts_at ? "2-digit" : undefined,
    minute: match.starts_at ? "2-digit" : undefined,
    timeZone: "Europe/Kyiv",
  }).format(new Date(rawDate));
}

export default function CreateGalleryAlbumPage() {
  const router = useRouter();

  const [form, setForm] = useState<AlbumFormState>(INITIAL_FORM);
  const [slugWasEdited, setSlugWasEdited] = useState(false);

  const [competitions, setCompetitions] = useState<CompetitionRow[]>([]);
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [opponents, setOpponents] = useState<OpponentRow[]>([]);
  const [news, setNews] = useState<NewsRow[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "">("");

  useEffect(() => {
    let isMounted = true;

    async function loadOptions() {
      const [
        { data: competitionData, error: competitionError },
        { data: matchData, error: matchError },
        { data: opponentData, error: opponentError },
        { data: newsData, error: newsError },
      ] = await Promise.all([
        supabase
          .from("competitions")
          .select("id, name, season")
          .order("created_at", { ascending: false }),

        supabase
          .from("matches")
          .select(
            "id, competition_id, opponent_id, starts_at, match_date, olimp_score, opponent_score",
          )
          .order("starts_at", { ascending: false }),

        supabase.from("opponents").select("id, name").order("name"),

        supabase
          .from("news")
          .select("id, title, status")
          .order("created_at", { ascending: false }),
      ]);

      if (!isMounted) {
        return;
      }

      if (competitionError || matchError || opponentError || newsError) {
        console.error("Gallery album options loading error:", {
          competitionError,
          matchError,
          opponentError,
          newsError,
        });

        setMessage("Не вдалося завантажити частину даних для форми.");
        setMessageType("error");
      }

      setCompetitions((competitionData ?? []) as CompetitionRow[]);
      setMatches((matchData ?? []) as MatchRow[]);
      setOpponents((opponentData ?? []) as OpponentRow[]);
      setNews((newsData ?? []) as NewsRow[]);
      setIsLoading(false);
    }

    void loadOptions();

    return () => {
      isMounted = false;
    };
  }, []);

  const opponentById = useMemo(
    () => new Map(opponents.map((opponent) => [opponent.id, opponent.name])),
    [opponents],
  );

  const selectedCompetition = useMemo(
    () =>
      competitions.find(
        (competition) => competition.id === form.competitionId,
      ) ?? null,
    [competitions, form.competitionId],
  );

  const filteredMatches = useMemo(() => {
    if (!form.competitionId) {
      return matches;
    }

    return matches.filter(
      (match) => match.competition_id === form.competitionId,
    );
  }, [form.competitionId, matches]);

  const selectedMatch = useMemo(
    () => matches.find((match) => match.id === form.matchId) ?? null,
    [form.matchId, matches],
  );

  const selectedNews = useMemo(
    () => news.find((item) => item.id === form.newsId) ?? null,
    [form.newsId, news],
  );

  function updateForm<Key extends keyof AlbumFormState>(
    key: Key,
    value: AlbumFormState[Key],
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function handleTitleChange(value: string) {
    setForm((current) => ({
      ...current,
      title: value,
      slug: slugWasEdited ? current.slug : createSlug(value),
    }));
  }

  function handleCompetitionChange(value: string) {
    const competition = competitions.find((item) => item.id === value);

    setForm((current) => ({
      ...current,
      competitionId: value,
      matchId:
        current.matchId &&
        matches.some(
          (match) =>
            match.id === current.matchId && match.competition_id === value,
        )
          ? current.matchId
          : "",
      season: current.season || competition?.season || "",
    }));
  }

  function handleMatchChange(value: string) {
    const match = matches.find((item) => item.id === value);

    setForm((current) => ({
      ...current,
      matchId: value,
      competitionId: current.competitionId || match?.competition_id || "",
      eventDate:
        current.eventDate ||
        (match?.starts_at ?? match?.match_date ?? "").slice(0, 10),
    }));
  }

  async function saveAlbum(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const title = form.title.trim();
    const slug = createSlug(form.slug);
    const description = form.description.trim();
    const season = form.season.trim();

    if (!title) {
      setMessage("Вкажіть назву альбому.");
      setMessageType("error");
      return;
    }

    if (!slug) {
      setMessage("Вкажіть коректний slug.");
      setMessageType("error");
      return;
    }

    setIsSaving(true);
    setMessage("");
    setMessageType("");

    try {
      const { data: existingAlbum, error: slugCheckError } = await supabase
        .from("gallery_albums")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();

      if (slugCheckError) {
        throw slugCheckError;
      }

      if (existingAlbum) {
        throw new Error("Альбом із таким slug уже існує. Змініть адресу.");
      }

      const publishedAt =
        form.status === "published" ? new Date().toISOString() : null;

      const { data, error } = await supabase
        .from("gallery_albums")
        .insert({
          title,
          slug,
          description: description || null,
          event_date: form.eventDate || null,
          season: season || null,
          cover_url: null,
          status: form.status,
          is_featured: form.isFeatured,
          competition_id: form.competitionId || null,
          match_id: form.matchId || null,
          news_id: form.newsId || null,
          published_at: publishedAt,
        })
        .select("id")
        .single();

      if (error) {
        throw error;
      }

      setMessage("Альбом створено. Переходимо до завантаження фотографій.");
      setMessageType("success");

      window.setTimeout(() => {
        router.push(`/admin/gallery/${data.id}`);
      }, 600);
    } catch (error) {
      console.error("Gallery album creation error:", error);

      setMessage(
        error instanceof Error ? error.message : "Не вдалося створити альбом.",
      );
      setMessageType("error");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[65vh] items-center justify-center">
        <div className="text-center">
          <span className="mx-auto block h-11 w-11 animate-spin rounded-full border-4 border-slate-200 border-t-sky-500" />

          <p className="mt-5 text-sm font-black uppercase tracking-[0.2em] text-sky-700">
            Підготовка форми...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-12">
      <section className="rounded-[2rem] bg-slate-950 px-6 py-8 text-white shadow-xl sm:px-9 sm:py-10">
        <Link
          href="/admin/gallery"
          className="text-sm font-bold text-sky-400 transition hover:text-sky-300"
        >
          ← Усі альбоми
        </Link>

        <p className="mt-6 text-xs font-black uppercase tracking-[0.26em] text-sky-400">
          Новий фотоальбом
        </p>

        <h1 className="mt-3 text-3xl font-black sm:text-4xl">
          Створити альбом
        </h1>

        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300 sm:text-base">
          Спочатку створіть альбом і додайте його основні дані. Після збереження
          відкриється сторінка масового завантаження фотографій.
        </p>
      </section>

      {message && (
        <div
          role={messageType === "error" ? "alert" : "status"}
          className={`mt-6 rounded-2xl border px-5 py-4 font-bold ${
            messageType === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {message}
        </div>
      )}

      <form
        onSubmit={(event) => void saveAlbum(event)}
        className="mt-8 grid gap-8 2xl:grid-cols-[minmax(0,1fr)_420px]"
      >
        <div className="space-y-6">
          <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-600">
              Основна інформація
            </p>

            <div className="mt-6 space-y-5">
              <label className="block">
                <span className="text-sm font-black text-slate-700">
                  Назва альбому *
                </span>

                <input
                  type="text"
                  value={form.title}
                  onChange={(event) => handleTitleChange(event.target.value)}
                  placeholder="Наприклад: Кубок Незалежності 2026"
                  className="mt-2 min-h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-lg font-bold outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
                />
              </label>

              <label className="block">
                <span className="text-sm font-black text-slate-700">
                  Slug *
                </span>

                <div className="mt-2 flex min-h-14 items-center rounded-2xl border border-slate-200 bg-slate-50 focus-within:border-sky-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-sky-100">
                  <span className="pl-4 text-sm font-bold text-slate-400">
                    /gallery/
                  </span>

                  <input
                    type="text"
                    value={form.slug}
                    onChange={(event) => {
                      setSlugWasEdited(true);
                      updateForm("slug", createSlug(event.target.value));
                    }}
                    placeholder="adresa-albomu"
                    className="min-h-14 min-w-0 flex-1 bg-transparent px-1 pr-4 font-semibold text-slate-800 outline-none"
                  />
                </div>
              </label>

              <label className="block">
                <span className="text-sm font-black text-slate-700">Опис</span>

                <textarea
                  value={form.description}
                  onChange={(event) =>
                    updateForm("description", event.target.value)
                  }
                  rows={5}
                  placeholder="Коротко опишіть подію або альбом"
                  className="mt-2 w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 leading-6 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-black text-slate-700">
                    Дата події
                  </span>

                  <input
                    type="date"
                    value={form.eventDate}
                    onChange={(event) =>
                      updateForm("eventDate", event.target.value)
                    }
                    className="mt-2 min-h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 font-semibold outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-black text-slate-700">
                    Сезон
                  </span>

                  <input
                    type="text"
                    value={form.season}
                    onChange={(event) =>
                      updateForm("season", event.target.value)
                    }
                    placeholder="2026/27"
                    className="mt-2 min-h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 font-semibold outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
                  />
                </label>
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-600">
              Зв’язки
            </p>

            <p className="mt-3 text-sm leading-6 text-slate-500">
              Усі зв’язки необов’язкові. Їх можна змінити пізніше.
            </p>

            <div className="mt-6 space-y-5">
              <label className="block">
                <span className="text-sm font-black text-slate-700">
                  Змагання
                </span>

                <select
                  value={form.competitionId}
                  onChange={(event) =>
                    handleCompetitionChange(event.target.value)
                  }
                  className="mt-2 min-h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 font-bold outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
                >
                  <option value="">Без прив’язки</option>

                  {competitions.map((competition) => (
                    <option key={competition.id} value={competition.id}>
                      {competition.name}
                      {competition.season ? ` · ${competition.season}` : ""}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-black text-slate-700">Матч</span>

                <select
                  value={form.matchId}
                  onChange={(event) => handleMatchChange(event.target.value)}
                  className="mt-2 min-h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 font-bold outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
                >
                  <option value="">Без прив’язки</option>

                  {filteredMatches.map((match) => {
                    const opponentName = match.opponent_id
                      ? opponentById.get(match.opponent_id)
                      : null;

                    const score =
                      match.olimp_score !== null &&
                      match.opponent_score !== null
                        ? ` ${match.olimp_score}:${match.opponent_score}`
                        : "";

                    return (
                      <option key={match.id} value={match.id}>
                        Олімп Футзал{score} {opponentName ?? "Суперник"} ·{" "}
                        {formatMatchDate(match)}
                      </option>
                    );
                  })}
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-black text-slate-700">
                  Пов’язана новина
                </span>

                <select
                  value={form.newsId}
                  onChange={(event) => updateForm("newsId", event.target.value)}
                  className="mt-2 min-h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 font-bold outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
                >
                  <option value="">Без прив’язки</option>

                  {news.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title}
                      {item.status === "draft" ? " · Чернетка" : ""}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-600">
              Публікація
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-black text-slate-700">
                  Статус
                </span>

                <select
                  value={form.status}
                  onChange={(event) =>
                    updateForm("status", event.target.value as AlbumStatus)
                  }
                  className="mt-2 min-h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 font-bold outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
                >
                  <option value="draft">Чернетка</option>
                  <option value="published">Опубліковано</option>
                </select>
              </label>

              <label className="flex cursor-pointer items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
                <input
                  type="checkbox"
                  checked={form.isFeatured}
                  onChange={(event) =>
                    updateForm("isFeatured", event.target.checked)
                  }
                  className="h-6 w-6 accent-violet-600"
                />

                <div>
                  <strong className="block text-slate-900">
                    Закріпити альбом
                  </strong>

                  <span className="mt-1 block text-sm text-slate-500">
                    Показувати серед головних матеріалів
                  </span>
                </div>
              </label>
            </div>
          </section>

          <div className="sticky bottom-4 z-30 rounded-[2rem] border border-slate-200 bg-white/95 p-4 shadow-2xl backdrop-blur">
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex min-h-14 flex-1 items-center justify-center rounded-full bg-slate-950 px-7 font-black text-white transition enabled:hover:bg-sky-500 enabled:hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving ? "Створення..." : "Створити альбом і додати фото"}
              </button>

              <Link
                href="/admin/gallery"
                className="inline-flex min-h-14 items-center justify-center rounded-full border border-slate-300 px-7 font-black text-slate-700 transition hover:bg-slate-100"
              >
                Скасувати
              </Link>
            </div>
          </div>
        </div>

        <aside className="2xl:sticky 2xl:top-6 2xl:self-start">
          <div className="overflow-hidden rounded-[2rem] bg-slate-950 text-white shadow-xl">
            <div className="flex aspect-[16/10] items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-sky-950">
              <div className="text-center">
                <span className="text-6xl">📷</span>

                <p className="mt-5 text-xs font-black uppercase tracking-[0.26em] text-sky-400">
                  Олімп Футзал
                </p>
              </div>
            </div>

            <div className="p-6">
              <div className="flex flex-wrap gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-black ${
                    form.status === "published"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {form.status === "published" ? "ОПУБЛІКОВАНО" : "ЧЕРНЕТКА"}
                </span>

                {form.isFeatured && (
                  <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-black text-violet-700">
                    📌 ЗАКРІПЛЕНО
                  </span>
                )}
              </div>

              <p className="mt-6 text-xs font-black uppercase tracking-[0.2em] text-sky-400">
                Попередній перегляд
              </p>

              <h2 className="mt-3 text-2xl font-black leading-tight">
                {form.title || "Назва фотоальбому"}
              </h2>

              <p className="mt-4 text-sm leading-6 text-slate-300">
                {form.description ||
                  "Опис альбому відображатиметься на публічній сторінці галереї."}
              </p>

              <div className="mt-6 space-y-3 border-t border-white/10 pt-6 text-sm">
                {form.eventDate && (
                  <p className="flex gap-3 text-slate-300">
                    <span>📅</span>
                    <span>{form.eventDate}</span>
                  </p>
                )}

                {form.season && (
                  <p className="flex gap-3 text-slate-300">
                    <span>🗓️</span>
                    <span>{form.season}</span>
                  </p>
                )}

                {selectedCompetition && (
                  <p className="flex gap-3 text-slate-300">
                    <span>🏆</span>
                    <span>{selectedCompetition.name}</span>
                  </p>
                )}

                {selectedMatch && (
                  <p className="flex gap-3 text-slate-300">
                    <span>⚽</span>
                    <span>
                      Олімп Футзал —{" "}
                      {selectedMatch.opponent_id
                        ? (opponentById.get(selectedMatch.opponent_id) ??
                          "Суперник")
                        : "Суперник"}
                    </span>
                  </p>
                )}

                {selectedNews && (
                  <p className="flex gap-3 text-slate-300">
                    <span>📰</span>
                    <span className="line-clamp-2">{selectedNews.title}</span>
                  </p>
                )}
              </div>

              <p className="mt-6 break-all text-xs font-bold text-slate-500">
                /gallery/{form.slug || "adresa-albomu"}
              </p>
            </div>
          </div>
        </aside>
      </form>
    </div>
  );
}
