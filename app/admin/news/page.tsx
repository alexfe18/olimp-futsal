"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { supabase } from "@/lib/supabase";

type NewsStatus = "draft" | "published";
type StatusFilter = "all" | NewsStatus;
type SortOption = "newest" | "oldest" | "title" | "featured";

type NewsRow = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  cover_url: string | null;
  status: NewsStatus;
  is_featured: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

function formatDate(value: string | null) {
  if (!value) return "Дата не вказана";

  return new Intl.DateTimeFormat("uk-UA", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Kyiv",
  }).format(new Date(value));
}

function getPreviewText(item: NewsRow) {
  if (item.excerpt?.trim()) return item.excerpt.trim();
  return item.content.replace(/\s+/g, " ").trim().slice(0, 180);
}

export default function AdminNewsPage() {
  const [news, setNews] = useState<NewsRow[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortOption, setSortOption] = useState<SortOption>("newest");
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "">("");

  async function loadNews(showLoader = false) {
    if (showLoader) setIsLoading(true);

    const { data, error } = await supabase
      .from("news")
      .select(
        "id, title, slug, excerpt, content, cover_url, status, is_featured, published_at, created_at, updated_at",
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("News loading error:", error);
      setMessage("Не вдалося завантажити новини.");
      setMessageType("error");
      setIsLoading(false);
      return;
    }

    setNews((data ?? []) as NewsRow[]);
    setIsLoading(false);
  }

  useEffect(() => {
    void loadNews(true);

    const channel = supabase
      .channel("olimp-admin-news-list")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "news" },
        () => {
          void loadNews();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const statistics = useMemo(
    () => ({
      total: news.length,
      published: news.filter((item) => item.status === "published").length,
      drafts: news.filter((item) => item.status === "draft").length,
      featured: news.filter((item) => item.is_featured).length,
    }),
    [news],
  );

  const filteredNews = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLocaleLowerCase("uk-UA");

    const result = news.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      if (!normalizedSearch) return true;

      return [item.title, item.slug, item.excerpt ?? "", item.content]
        .join(" ")
        .toLocaleLowerCase("uk-UA")
        .includes(normalizedSearch);
    });

    return result.sort((first, second) => {
      if (sortOption === "oldest") {
        return (
          new Date(first.created_at).getTime() -
          new Date(second.created_at).getTime()
        );
      }
      if (sortOption === "title")
        return first.title.localeCompare(second.title, "uk");
      if (sortOption === "featured") {
        if (first.is_featured !== second.is_featured) {
          return Number(second.is_featured) - Number(first.is_featured);
        }
      }
      return (
        new Date(second.created_at).getTime() -
        new Date(first.created_at).getTime()
      );
    });
  }, [news, searchQuery, sortOption, statusFilter]);

  async function togglePublication(item: NewsRow) {
    setBusyId(item.id);
    setMessage("");
    setMessageType("");

    const nextStatus: NewsStatus =
      item.status === "published" ? "draft" : "published";
    const { error } = await supabase
      .from("news")
      .update({
        status: nextStatus,
        published_at:
          nextStatus === "published"
            ? (item.published_at ?? new Date().toISOString())
            : item.published_at,
      })
      .eq("id", item.id);

    if (error) {
      console.error("News publication update error:", error);
      setMessage("Не вдалося змінити статус публікації.");
      setMessageType("error");
    } else {
      setMessage(
        nextStatus === "published"
          ? "Новину опубліковано."
          : "Новину переведено у чернетки.",
      );
      setMessageType("success");
      await loadNews();
    }

    setBusyId(null);
  }

  async function toggleFeatured(item: NewsRow) {
    setBusyId(item.id);
    const { error } = await supabase
      .from("news")
      .update({ is_featured: !item.is_featured })
      .eq("id", item.id);

    if (error) {
      console.error("News featured update error:", error);
      setMessage("Не вдалося змінити статус закріплення.");
      setMessageType("error");
    } else {
      setMessage(
        item.is_featured ? "Новину відкріплено." : "Новину закріплено.",
      );
      setMessageType("success");
      await loadNews();
    }

    setBusyId(null);
  }

  async function deleteNews(item: NewsRow) {
    if (!window.confirm(`Видалити новину «${item.title}»?`)) return;

    setBusyId(item.id);
    const { error } = await supabase.from("news").delete().eq("id", item.id);

    if (error) {
      console.error("News deletion error:", error);
      setMessage("Не вдалося видалити новину.");
      setMessageType("error");
    } else {
      setMessage("Новину видалено.");
      setMessageType("success");
      await loadNews();
    }

    setBusyId(null);
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[65vh] items-center justify-center">
        <div className="text-center">
          <span className="mx-auto block h-11 w-11 animate-spin rounded-full border-4 border-slate-200 border-t-sky-500" />
          <p className="mt-5 text-sm font-black uppercase tracking-[0.2em] text-sky-700">
            Завантаження новин...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-12">
      <section className="rounded-[2rem] bg-slate-950 px-6 py-8 text-white shadow-xl sm:px-9 sm:py-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.26em] text-sky-400">
              Інформаційний простір клубу
            </p>
            <h1 className="mt-4 text-3xl font-black sm:text-4xl">Новини</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300 sm:text-base">
              Публікуйте важливі події, анонси матчів, результати та історії з
              життя «Олімп Футзал».
            </p>
          </div>

          <Link
            href="/admin/news/new"
            className="inline-flex min-h-12 items-center justify-center rounded-full bg-sky-500 px-6 font-black text-slate-950 transition hover:bg-sky-400"
          >
            + Створити новину
          </Link>
        </div>
      </section>

      {message && (
        <div
          className={`mt-6 rounded-2xl border px-5 py-4 font-bold ${messageType === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}
        >
          {message}
        </div>
      )}

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatisticCard
          label="Усього новин"
          value={statistics.total}
          accent="text-sky-600"
        />
        <StatisticCard
          label="Опубліковано"
          value={statistics.published}
          accent="text-emerald-600"
        />
        <StatisticCard
          label="Чернетки"
          value={statistics.drafts}
          accent="text-amber-600"
        />
        <StatisticCard
          label="Закріплені"
          value={statistics.featured}
          accent="text-violet-600"
        />
      </section>

      <section className="mt-10">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-sky-600">
              Контент клубу
            </p>
            <h2 className="mt-2 text-3xl font-black text-slate-950">
              Усі новини
            </h2>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Пошук новини"
              className="min-h-12 rounded-2xl border border-slate-200 bg-white px-4 font-semibold outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
            />
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as StatusFilter)
              }
              className="min-h-12 rounded-2xl border border-slate-200 bg-white px-4 font-bold outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
            >
              <option value="all">Усі статуси</option>
              <option value="published">Опубліковані</option>
              <option value="draft">Чернетки</option>
            </select>
            <select
              value={sortOption}
              onChange={(event) =>
                setSortOption(event.target.value as SortOption)
              }
              className="min-h-12 rounded-2xl border border-slate-200 bg-white px-4 font-bold outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
            >
              <option value="newest">Спочатку нові</option>
              <option value="oldest">Спочатку старі</option>
              <option value="title">За назвою</option>
              <option value="featured">Спочатку закріплені</option>
            </select>
          </div>
        </div>

        {filteredNews.length ? (
          <div className="mt-6 grid gap-6 xl:grid-cols-2">
            {filteredNews.map((item) => (
              <NewsCard
                key={item.id}
                item={item}
                isBusy={busyId === item.id}
                onTogglePublication={() => void togglePublication(item)}
                onToggleFeatured={() => void toggleFeatured(item)}
                onDelete={() => void deleteNews(item)}
              />
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-[2rem] border border-dashed border-slate-300 bg-white p-10 text-center">
            <p className="text-xl font-black text-slate-800">
              Новин за вибраними фільтрами не знайдено
            </p>
            <p className="mt-2 text-slate-500">
              Змініть пошуковий запит або створіть першу новину.
            </p>
            <Link
              href="/admin/news/new"
              className="mt-6 inline-flex min-h-12 items-center justify-center rounded-full bg-slate-950 px-6 font-black text-white transition hover:bg-sky-500 hover:text-slate-950"
            >
              + Створити новину
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}

function StatisticCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <article className="rounded-[1.7rem] border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-bold text-slate-500">{label}</p>
      <strong className={`mt-3 block text-4xl font-black ${accent}`}>
        {value}
      </strong>
    </article>
  );
}

function NewsCard({
  item,
  isBusy,
  onTogglePublication,
  onToggleFeatured,
  onDelete,
}: {
  item: NewsRow;
  isBusy: boolean;
  onTogglePublication: () => void;
  onToggleFeatured: () => void;
  onDelete: () => void;
}) {
  return (
    <article className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
      <div className="relative aspect-[16/8] overflow-hidden bg-slate-950">
        {item.cover_url ? (
          <img
            src={item.cover_url}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-sky-950 text-center text-white">
            <div>
              <span className="text-5xl">📰</span>
              <p className="mt-4 text-xs font-black uppercase tracking-[0.24em] text-sky-400">
                Олімп Футзал
              </p>
            </div>
          </div>
        )}

        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
          <StatusBadge status={item.status} />
          {item.is_featured && (
            <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-black text-violet-700 shadow-sm">
              📌 ЗАКРІПЛЕНО
            </span>
          )}
        </div>
      </div>

      <div className="p-6">
        <p className="text-sm font-semibold text-slate-500">
          {item.status === "published"
            ? formatDate(item.published_at)
            : `Створено: ${formatDate(item.created_at)}`}
        </p>
        <h3 className="mt-3 text-2xl font-black leading-tight text-slate-950">
          {item.title}
        </h3>
        <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">
          {getPreviewText(item) || "Короткий опис ще не додано."}
        </p>
        <p className="mt-4 text-xs font-bold text-slate-400">
          /news/{item.slug}
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            href={`/admin/news/${item.id}`}
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-slate-950 px-5 text-sm font-black text-white transition hover:bg-sky-500 hover:text-slate-950"
          >
            Редагувати
          </Link>
          <button
            type="button"
            disabled={isBusy}
            onClick={onTogglePublication}
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-300 px-5 text-sm font-black text-slate-700 disabled:opacity-50"
          >
            {item.status === "published" ? "У чернетки" : "Опублікувати"}
          </button>
          <button
            type="button"
            disabled={isBusy}
            onClick={onToggleFeatured}
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-300 px-5 text-sm font-black text-slate-700 disabled:opacity-50"
          >
            {item.is_featured ? "Відкріпити" : "Закріпити"}
          </button>
          <button
            type="button"
            disabled={isBusy}
            onClick={onDelete}
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-red-200 px-5 text-sm font-black text-red-600 disabled:opacity-50"
          >
            Видалити
          </button>
        </div>
      </div>
    </article>
  );
}

function StatusBadge({ status }: { status: NewsStatus }) {
  return status === "published" ? (
    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700 shadow-sm">
      ОПУБЛІКОВАНО
    </span>
  ) : (
    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-700 shadow-sm">
      ЧЕРНЕТКА
    </span>
  );
}
