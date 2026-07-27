"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { supabase } from "@/lib/supabase";

type NewsRow = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  cover_url: string | null;
  status: "draft" | "published";
  is_featured: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

function formatDate(value: string | null) {
  if (!value) return "";

  return new Intl.DateTimeFormat("uk-UA", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Kyiv",
  }).format(new Date(value));
}

export default function PublicNewsDetailsPage() {
  const params = useParams<{ slug: string }>();
  const slug = decodeURIComponent(params.slug);

  const [news, setNews] = useState<NewsRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadNews() {
      setIsLoading(true);
      setNotFound(false);

      const { data, error } = await supabase
        .from("news")
        .select(
          "id, title, slug, excerpt, content, cover_url, status, is_featured, published_at, created_at, updated_at",
        )
        .eq("slug", slug)
        .eq("status", "published")
        .lte("published_at", new Date().toISOString())
        .maybeSingle();

      if (!isMounted) return;

      if (error || !data) {
        if (error) console.error("Public news loading error:", error);
        setNews(null);
        setNotFound(true);
        setIsLoading(false);
        return;
      }

      setNews(data as NewsRow);
      setIsLoading(false);
    }

    void loadNews();

    return () => {
      isMounted = false;
    };
  }, [slug]);

  const paragraphs = useMemo(() => {
    if (!news) return [];

    return news.content
      .split("\n")
      .map((paragraph) => paragraph.trim())
      .filter(Boolean);
  }, [news]);

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-50 px-5 py-10">
        <div className="mx-auto flex min-h-[70vh] max-w-6xl items-center justify-center">
          <div className="text-center">
            <span className="mx-auto block h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-sky-500" />
            <p className="mt-5 text-sm font-black uppercase tracking-[0.22em] text-sky-700">
              Завантаження новини...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (notFound || !news) {
    return (
      <main className="min-h-screen bg-slate-50 px-5 py-10">
        <section className="mx-auto flex min-h-[75vh] max-w-5xl items-center justify-center">
          <div className="w-full rounded-[2rem] bg-slate-950 px-6 py-12 text-center text-white shadow-2xl sm:px-10">
            <p className="text-xs font-black uppercase tracking-[0.26em] text-sky-400">
              Олімп Футзал
            </p>
            <h1 className="mt-5 text-4xl font-black sm:text-5xl">
              Новину не знайдено
            </h1>
            <p className="mx-auto mt-4 max-w-xl leading-7 text-slate-300">
              Можливо, матеріал ще не опубліковано, його адресу змінено або
              новину було видалено.
            </p>

            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/"
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-sky-500 px-6 font-black text-slate-950 transition hover:bg-sky-400"
              >
                На головну
              </Link>
              <Link
                href="/news"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/20 px-6 font-black text-white transition hover:bg-white/10"
              >
                Усі новини
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="bg-slate-950 text-white">
        <div className="mx-auto max-w-7xl px-5 py-5 sm:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Link
              href="/"
              className="text-lg font-black tracking-wide text-white"
            >
              Олімп Футзал
            </Link>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/news"
                className="inline-flex min-h-10 items-center justify-center rounded-full border border-white/15 px-4 text-sm font-black text-white transition hover:bg-white/10"
              >
                Усі новини
              </Link>
              <Link
                href="/"
                className="inline-flex min-h-10 items-center justify-center rounded-full bg-sky-500 px-4 text-sm font-black text-slate-950 transition hover:bg-sky-400"
              >
                На головну
              </Link>
            </div>
          </div>
        </div>
      </section>

      <article>
        <header className="bg-slate-950 pb-14 text-white sm:pb-20">
          <div className="mx-auto max-w-5xl px-5 pt-12 sm:px-8 sm:pt-16">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-sky-500/15 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-sky-300">
                Новини клубу
              </span>

              {news.is_featured && (
                <span className="rounded-full bg-violet-500/15 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-violet-200">
                  📌 Закріплено
                </span>
              )}
            </div>

            <p className="mt-6 text-sm font-bold text-slate-400">
              {formatDate(news.published_at)}
            </p>

            <h1 className="mt-4 max-w-4xl text-4xl font-black leading-tight sm:text-5xl lg:text-6xl">
              {news.title}
            </h1>

            {news.excerpt && (
              <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300 sm:text-xl">
                {news.excerpt}
              </p>
            )}
          </div>
        </header>

        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="-mt-8 overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl sm:-mt-12">
            {news.cover_url ? (
              <div className="flex w-full items-center justify-center bg-[#06142B]">
                <img
                  src={news.cover_url}
                  alt={news.title}
                  className="h-auto max-h-none w-full object-contain object-center"
                />
              </div>
            ) : (
              <div className="flex aspect-[16/7] items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-sky-950">
                <div className="text-center text-white">
                  <span className="text-6xl">📰</span>
                  <p className="mt-5 text-sm font-black uppercase tracking-[0.28em] text-sky-400">
                    Олімп Футзал
                  </p>
                </div>
              </div>
            )}

            <div className="px-6 py-9 sm:px-10 sm:py-12 lg:px-16">
              <div className="mx-auto max-w-3xl space-y-6">
                {paragraphs.map((paragraph, index) => (
                  <p
                    key={`${paragraph}-${index}`}
                    className={`whitespace-pre-line leading-8 text-slate-700 ${
                      index === 0
                        ? "text-lg font-semibold text-slate-900"
                        : "text-base sm:text-lg"
                    }`}
                  >
                    {paragraph}
                  </p>
                ))}
              </div>

              <div className="mx-auto mt-12 max-w-3xl border-t border-slate-200 pt-8">
                <div className="rounded-3xl bg-slate-950 px-6 py-7 text-white sm:px-8">
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-400">
                    Разом до вершин
                  </p>

                  <h2 className="mt-3 text-2xl font-black">
                    Стежте за новинами «Олімп Футзал»
                  </h2>

                  <p className="mt-3 leading-7 text-slate-300">
                    Матчі, тренування, досягнення команди та нові можливості
                    клубної цифрової системи.
                  </p>

                  <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                    <Link
                      href="/news"
                      className="inline-flex min-h-12 items-center justify-center rounded-full bg-sky-500 px-6 font-black text-slate-950 transition hover:bg-sky-400"
                    >
                      Інші новини
                    </Link>
                    <Link
                      href="/"
                      className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/20 px-6 font-black text-white transition hover:bg-white/10"
                    >
                      На головну
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </article>

      <footer className="mt-14 bg-slate-950 px-5 py-8 text-center text-sm text-slate-400">
        <p>«Олімп Футзал» · Миколаїв</p>
      </footer>
    </main>
  );
}
