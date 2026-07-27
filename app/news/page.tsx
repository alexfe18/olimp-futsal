"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { supabase } from "@/lib/supabase";

type NewsRow = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  cover_url: string | null;
  status: "draft" | "published";
  is_featured: boolean;
  published_at: string | null;
  created_at: string;
};

type SortOption = "featured" | "newest" | "oldest" | "title";

function formatDate(value: string | null) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("uk-UA", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Kyiv",
  }).format(new Date(value));
}

export default function PublicNewsPage() {
  const [news, setNews] = useState<NewsRow[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState<SortOption>("featured");

  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadNews() {
      setIsLoading(true);
      setHasError(false);

      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from("news")
        .select(
          "id, title, slug, excerpt, content, cover_url, status, is_featured, published_at, created_at",
        )
        .eq("status", "published")
        .lte("published_at", now)
        .order("is_featured", { ascending: false })
        .order("published_at", {
          ascending: false,
          nullsFirst: false,
        })
        .order("created_at", { ascending: false });

      if (!isMounted) {
        return;
      }

      if (error) {
        console.error("Public news loading error:", error);
        setHasError(true);
      }

      setNews((data ?? []) as NewsRow[]);
      setIsLoading(false);
    }

    void loadNews();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredNews = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLocaleLowerCase("uk-UA");

    const result = news.filter((item) => {
      if (!normalizedSearch) {
        return true;
      }

      return [item.title, item.excerpt ?? "", item.content ?? ""]
        .join(" ")
        .toLocaleLowerCase("uk-UA")
        .includes(normalizedSearch);
    });

    return result.sort((first, second) => {
      const firstDate = new Date(
        first.published_at ?? first.created_at,
      ).getTime();

      const secondDate = new Date(
        second.published_at ?? second.created_at,
      ).getTime();

      if (sortOption === "newest") {
        return secondDate - firstDate;
      }

      if (sortOption === "oldest") {
        return firstDate - secondDate;
      }

      if (sortOption === "title") {
        return first.title.localeCompare(second.title, "uk");
      }

      if (first.is_featured !== second.is_featured) {
        return Number(second.is_featured) - Number(first.is_featured);
      }

      return secondDate - firstDate;
    });
  }, [news, searchQuery, sortOption]);

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-50 px-5 py-10">
        <div className="mx-auto flex min-h-[75vh] max-w-7xl items-center justify-center">
          <div className="text-center">
            <span className="mx-auto block h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-sky-500" />

            <p className="mt-5 text-sm font-black uppercase tracking-[0.22em] text-sky-700">
              Завантаження новин...
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="bg-slate-950 text-white">
        <div className="mx-auto max-w-7xl px-5 py-5 sm:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Link href="/" className="text-lg font-black tracking-wide">
              Олімп Футзал
            </Link>

            <Link
              href="/"
              className="inline-flex min-h-10 items-center justify-center rounded-full bg-sky-500 px-5 text-sm font-black text-slate-950 transition hover:bg-sky-400"
            >
              На головну
            </Link>
          </div>
        </div>
      </header>

      <section className="bg-slate-950 pb-16 text-white sm:pb-20">
        <div className="mx-auto max-w-7xl px-5 pt-12 sm:px-8 sm:pt-16">
          <p className="text-xs font-black uppercase tracking-[0.28em] text-sky-400">
            Життя клубу
          </p>

          <h1 className="mt-4 max-w-4xl text-5xl font-black leading-tight sm:text-6xl lg:text-7xl">
            Новини
          </h1>

          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300 sm:text-xl">
            Матчі, тренування, турніри, досягнення та важливі події «Олімп
            Футзал».
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <span className="rounded-full bg-white/10 px-4 py-2 text-sm font-black text-white">
              {news.length} {news.length === 1 ? "новина" : "новин"}
            </span>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
        {hasError && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 font-semibold text-amber-800">
            Не вдалося завантажити новини. Спробуйте оновити сторінку.
          </div>
        )}

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_260px]">
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Пошук новини"
            className="min-h-14 rounded-2xl border border-slate-200 bg-white px-5 font-semibold outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
          />

          <select
            value={sortOption}
            onChange={(event) =>
              setSortOption(event.target.value as SortOption)
            }
            className="min-h-14 rounded-2xl border border-slate-200 bg-white px-5 font-bold outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
          >
            <option value="featured">Спочатку головні</option>
            <option value="newest">Спочатку нові</option>
            <option value="oldest">Спочатку старі</option>
            <option value="title">За назвою</option>
          </select>
        </div>

        {filteredNews.length ? (
          <div className="mt-8 grid gap-7 md:grid-cols-2 xl:grid-cols-3">
            {filteredNews.map((item) => (
              <NewsCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <div className="mt-8 rounded-[2rem] border border-dashed border-slate-300 bg-white p-10 text-center">
            <p className="text-2xl font-black text-slate-900">
              Новин не знайдено
            </p>

            <p className="mt-3 text-slate-500">
              Змініть пошуковий запит або скиньте фільтр.
            </p>

            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="mt-6 inline-flex min-h-12 items-center justify-center rounded-full bg-slate-950 px-6 font-black text-white transition hover:bg-sky-500 hover:text-slate-950"
            >
              Скинути пошук
            </button>
          </div>
        )}
      </section>

      <footer className="bg-slate-950 px-5 py-8 text-center text-sm text-slate-400">
        <p>«Олімп Футзал» · Миколаїв</p>
      </footer>
    </main>
  );
}

function NewsCard({ item }: { item: NewsRow }) {
  const previewText =
    item.excerpt?.trim() || item.content?.trim() || "Новина «Олімп Футзал».";

  return (
    <article className="group overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl">
      <Link href={`/news/${item.slug}`} className="block">
        <div className="relative aspect-[16/10] overflow-hidden bg-slate-950">
          {item.cover_url ? (
            <img
              src={item.cover_url}
              alt={item.title}
              loading="lazy"
              className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-sky-950 text-center text-white">
              <div>
                <span className="text-6xl">📰</span>

                <p className="mt-5 text-xs font-black uppercase tracking-[0.24em] text-sky-400">
                  Олімп Футзал
                </p>
              </div>
            </div>
          )}

          {item.is_featured && (
            <span className="absolute left-4 top-4 rounded-full bg-violet-100 px-3 py-1 text-xs font-black text-violet-700 shadow-sm">
              📌 ГОЛОВНА
            </span>
          )}
        </div>

        <div className="p-6">
          <p className="text-sm font-bold text-slate-500">
            {formatDate(item.published_at ?? item.created_at)}
          </p>

          <h2 className="mt-3 text-2xl font-black leading-tight text-slate-950">
            {item.title}
          </h2>

          <p className="mt-3 line-clamp-4 min-h-[6rem] text-sm leading-6 text-slate-600">
            {previewText}
          </p>

          <span className="mt-6 inline-flex items-center gap-2 font-black text-sky-600 transition group-hover:gap-3">
            Читати новину
            <span aria-hidden="true">→</span>
          </span>
        </div>
      </Link>
    </article>
  );
}
