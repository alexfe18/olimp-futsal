"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { supabase } from "@/lib/supabase";

type GalleryAlbumRow = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  event_date: string | null;
  season: string | null;
  cover_url: string | null;
  status: "draft" | "published";
  is_featured: boolean;
  competition_id: string | null;
  match_id: string | null;
  news_id: string | null;
  published_at: string | null;
  created_at: string;
};

type GalleryPhotoRow = {
  id: string;
  album_id: string;
  image_url: string;
  caption: string | null;
  alt_text: string | null;
  sort_order: number;
  width: number | null;
  height: number | null;
  is_cover: boolean;
};

type CompetitionRow = {
  id: string;
  name: string;
  season: string | null;
};

type MatchRow = {
  id: string;
  opponent_id: string | null;
  olimp_score: number | null;
  opponent_score: number | null;
  starts_at: string | null;
  match_date: string | null;
};

type OpponentRow = {
  id: string;
  name: string;
};

type NewsRow = {
  id: string;
  title: string;
  slug: string;
  status: "draft" | "published";
};

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

export default function PublicGalleryAlbumPage() {
  const params = useParams<{ slug: string }>();
  const slug = decodeURIComponent(params.slug);

  const [album, setAlbum] = useState<GalleryAlbumRow | null>(null);
  const [photos, setPhotos] = useState<GalleryPhotoRow[]>([]);
  const [competition, setCompetition] = useState<CompetitionRow | null>(null);
  const [match, setMatch] = useState<MatchRow | null>(null);
  const [opponent, setOpponent] = useState<OpponentRow | null>(null);
  const [linkedNews, setLinkedNews] = useState<NewsRow | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activePhotoIndex, setActivePhotoIndex] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadAlbum() {
      setIsLoading(true);
      setNotFound(false);

      const { data: albumData, error: albumError } = await supabase
        .from("gallery_albums")
        .select(
          "id, title, slug, description, event_date, season, cover_url, status, is_featured, competition_id, match_id, news_id, published_at, created_at",
        )
        .eq("slug", slug)
        .eq("status", "published")
        .lte("published_at", new Date().toISOString())
        .maybeSingle();

      if (!isMounted) {
        return;
      }

      if (albumError || !albumData) {
        if (albumError) {
          console.error("Public gallery album loading error:", albumError);
        }

        setNotFound(true);
        setIsLoading(false);
        return;
      }

      const loadedAlbum = albumData as GalleryAlbumRow;

      const [
        { data: photoData, error: photoError },
        competitionResult,
        matchResult,
        newsResult,
      ] = await Promise.all([
        supabase
          .from("gallery_photos")
          .select(
            "id, album_id, image_url, caption, alt_text, sort_order, width, height, is_cover",
          )
          .eq("album_id", loadedAlbum.id)
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: true }),

        loadedAlbum.competition_id
          ? supabase
              .from("competitions")
              .select("id, name, season")
              .eq("id", loadedAlbum.competition_id)
              .maybeSingle()
          : Promise.resolve({
              data: null,
              error: null,
            }),

        loadedAlbum.match_id
          ? supabase
              .from("matches")
              .select(
                "id, opponent_id, olimp_score, opponent_score, starts_at, match_date",
              )
              .eq("id", loadedAlbum.match_id)
              .maybeSingle()
          : Promise.resolve({
              data: null,
              error: null,
            }),

        loadedAlbum.news_id
          ? supabase
              .from("news")
              .select("id, title, slug, status")
              .eq("id", loadedAlbum.news_id)
              .eq("status", "published")
              .maybeSingle()
          : Promise.resolve({
              data: null,
              error: null,
            }),
      ]);

      if (!isMounted) {
        return;
      }

      if (photoError) {
        console.error("Public gallery photos loading error:", photoError);
      }

      const loadedMatch = matchResult.data as MatchRow | null;

      let loadedOpponent: OpponentRow | null = null;

      if (loadedMatch?.opponent_id) {
        const { data: opponentData, error: opponentError } = await supabase
          .from("opponents")
          .select("id, name")
          .eq("id", loadedMatch.opponent_id)
          .maybeSingle();

        if (opponentError) {
          console.error(
            "Public gallery opponent loading error:",
            opponentError,
          );
        }

        loadedOpponent = opponentData as OpponentRow | null;
      }

      if (!isMounted) {
        return;
      }

      setAlbum(loadedAlbum);
      setPhotos((photoData ?? []) as GalleryPhotoRow[]);
      setCompetition(competitionResult.data as CompetitionRow | null);
      setMatch(loadedMatch);
      setOpponent(loadedOpponent);
      setLinkedNews(newsResult.data as NewsRow | null);
      setIsLoading(false);
    }

    void loadAlbum();

    return () => {
      isMounted = false;
    };
  }, [slug]);

  const coverPhoto = useMemo(
    () => photos.find((photo) => photo.is_cover) ?? photos[0] ?? null,
    [photos],
  );

  const activePhoto =
    activePhotoIndex !== null ? (photos[activePhotoIndex] ?? null) : null;

  const closeLightbox = useCallback(() => {
    setActivePhotoIndex(null);
  }, []);

  const showPreviousPhoto = useCallback(() => {
    setActivePhotoIndex((current) => {
      if (current === null || photos.length === 0) {
        return current;
      }

      return current === 0 ? photos.length - 1 : current - 1;
    });
  }, [photos.length]);

  const showNextPhoto = useCallback(() => {
    setActivePhotoIndex((current) => {
      if (current === null || photos.length === 0) {
        return current;
      }

      return current === photos.length - 1 ? 0 : current + 1;
    });
  }, [photos.length]);

  useEffect(() => {
    if (activePhotoIndex === null) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeLightbox();
      }

      if (event.key === "ArrowLeft") {
        showPreviousPhoto();
      }

      if (event.key === "ArrowRight") {
        showNextPhoto();
      }
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activePhotoIndex, closeLightbox, showNextPhoto, showPreviousPhoto]);

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-50 px-5 py-10">
        <div className="mx-auto flex min-h-[70vh] max-w-6xl items-center justify-center">
          <div className="text-center">
            <span className="mx-auto block h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-sky-500" />

            <p className="mt-5 text-sm font-black uppercase tracking-[0.22em] text-sky-700">
              Завантаження альбому...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (notFound || !album) {
    return (
      <main className="min-h-screen bg-slate-50 px-5 py-10">
        <section className="mx-auto flex min-h-[75vh] max-w-5xl items-center justify-center">
          <div className="w-full rounded-[2rem] bg-slate-950 px-6 py-12 text-center text-white shadow-2xl sm:px-10">
            <p className="text-xs font-black uppercase tracking-[0.26em] text-sky-400">
              Олімп Футзал
            </p>

            <h1 className="mt-5 text-4xl font-black sm:text-5xl">
              Альбом не знайдено
            </h1>

            <p className="mx-auto mt-4 max-w-xl leading-7 text-slate-300">
              Можливо, альбом ще не опубліковано, його адресу змінено або
              матеріал було видалено.
            </p>

            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/gallery"
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-sky-500 px-6 font-black text-slate-950 transition hover:bg-sky-400"
              >
                Уся галерея
              </Link>

              <Link
                href="/"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/20 px-6 font-black text-white transition hover:bg-white/10"
              >
                На головну
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  const matchScore =
    match && match.olimp_score !== null && match.opponent_score !== null
      ? `${match.olimp_score}:${match.opponent_score}`
      : null;

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="bg-slate-950 text-white">
        <div className="mx-auto max-w-7xl px-5 py-5 sm:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Link href="/" className="text-lg font-black tracking-wide">
              Олімп Футзал
            </Link>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/gallery"
                className="inline-flex min-h-10 items-center justify-center rounded-full border border-white/15 px-4 text-sm font-black transition hover:bg-white/10"
              >
                Уся галерея
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
      </header>

      <section className="bg-slate-950 pb-16 text-white sm:pb-24">
        <div className="mx-auto max-w-6xl px-5 pt-12 sm:px-8 sm:pt-16">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-sky-500/15 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-sky-300">
              Фотоальбом
            </span>

            {album.is_featured && (
              <span className="rounded-full bg-violet-500/15 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-violet-200">
                📌 Закріплено
              </span>
            )}

            {album.season && (
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black text-slate-200">
                {album.season}
              </span>
            )}
          </div>

          {album.event_date && (
            <p className="mt-6 text-sm font-bold text-slate-400">
              {formatDate(album.event_date)}
            </p>
          )}

          <h1 className="mt-4 max-w-4xl text-4xl font-black leading-tight sm:text-5xl lg:text-6xl">
            {album.title}
          </h1>

          {album.description && (
            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300 sm:text-xl">
              {album.description}
            </p>
          )}

          <div className="mt-8 flex flex-wrap gap-3 text-sm">
            <span className="rounded-full bg-white/10 px-4 py-2 font-black text-white">
              📷 {photos.length} фото
            </span>

            {competition && (
              <span className="rounded-full bg-white/10 px-4 py-2 font-bold text-slate-200">
                🏆 {competition.name}
              </span>
            )}

            {match && (
              <span className="rounded-full bg-white/10 px-4 py-2 font-bold text-slate-200">
                ⚽ Олімп Футзал {matchScore ? `${matchScore} ` : "— "}
                {opponent?.name ?? "Суперник"}
              </span>
            )}
          </div>
        </div>
      </section>

      {coverPhoto && (
        <section className="mx-auto -mt-10 max-w-7xl px-5 sm:-mt-16 sm:px-8">
          <button
            type="button"
            onClick={() => {
              const index = photos.findIndex(
                (photo) => photo.id === coverPhoto.id,
              );

              setActivePhotoIndex(index >= 0 ? index : 0);
            }}
            className="group block w-full overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950 shadow-2xl"
          >
            <img
              src={coverPhoto.image_url}
              alt={coverPhoto.alt_text || coverPhoto.caption || album.title}
              className="max-h-[760px] w-full object-contain object-center transition duration-500 group-hover:scale-[1.01]"
            />
          </button>
        </section>
      )}

      <section className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-sky-600">
              Фотографії
            </p>

            <h2 className="mt-2 text-3xl font-black text-slate-950 sm:text-4xl">
              Моменти альбому
            </h2>
          </div>

          <p className="text-sm font-bold text-slate-500">
            Натисніть на фотографію для перегляду
          </p>
        </div>

        {photos.length ? (
          <div className="mt-8 columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4">
            {photos.map((photo, index) => (
              <button
                key={photo.id}
                type="button"
                onClick={() => setActivePhotoIndex(index)}
                className="group mb-4 block w-full break-inside-avoid overflow-hidden rounded-3xl bg-slate-200 text-left shadow-sm"
              >
                <img
                  src={photo.image_url}
                  alt={
                    photo.alt_text ||
                    photo.caption ||
                    `${album.title} — фото ${index + 1}`
                  }
                  loading="lazy"
                  className="h-auto w-full transition duration-500 group-hover:scale-[1.03]"
                />

                {photo.caption && (
                  <span className="block bg-white px-4 py-3 text-sm font-semibold leading-6 text-slate-700">
                    {photo.caption}
                  </span>
                )}
              </button>
            ))}
          </div>
        ) : (
          <div className="mt-8 rounded-[2rem] border border-dashed border-slate-300 bg-white p-10 text-center">
            <p className="text-xl font-black text-slate-800">
              Фотографії ще не додано
            </p>
          </div>
        )}

        {(linkedNews || competition || match) && (
          <div className="mt-14 rounded-[2rem] bg-slate-950 p-6 text-white shadow-xl sm:p-8">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-400">
              Пов’язані матеріали
            </p>

            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {linkedNews && (
                <Link
                  href={`/news/${linkedNews.slug}`}
                  className="rounded-3xl bg-white/5 p-5 transition hover:bg-white/10"
                >
                  <span className="text-3xl">📰</span>

                  <p className="mt-4 text-xs font-black uppercase tracking-[0.18em] text-sky-300">
                    Новина
                  </p>

                  <h3 className="mt-2 text-lg font-black">
                    {linkedNews.title}
                  </h3>

                  <span className="mt-4 inline-block text-sm font-black text-sky-400">
                    Відкрити новину →
                  </span>
                </Link>
              )}

              {competition && (
                <div className="rounded-3xl bg-white/5 p-5">
                  <span className="text-3xl">🏆</span>

                  <p className="mt-4 text-xs font-black uppercase tracking-[0.18em] text-sky-300">
                    Змагання
                  </p>

                  <h3 className="mt-2 text-lg font-black">
                    {competition.name}
                  </h3>

                  {competition.season && (
                    <p className="mt-2 text-sm text-slate-300">
                      Сезон {competition.season}
                    </p>
                  )}
                </div>
              )}

              {match && (
                <div className="rounded-3xl bg-white/5 p-5">
                  <span className="text-3xl">⚽</span>

                  <p className="mt-4 text-xs font-black uppercase tracking-[0.18em] text-sky-300">
                    Матч
                  </p>

                  <h3 className="mt-2 text-lg font-black">
                    Олімп Футзал {matchScore ? `${matchScore} ` : "— "}
                    {opponent?.name ?? "Суперник"}
                  </h3>

                  <p className="mt-2 text-sm text-slate-300">
                    {formatDate(match.starts_at ?? match.match_date)}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      <footer className="bg-slate-950 px-5 py-8 text-center text-sm text-slate-400">
        <p>«Олімп Футзал» · Миколаїв</p>
      </footer>

      {activePhoto && activePhotoIndex !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Перегляд фотографії"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-3 sm:p-6"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) {
              closeLightbox();
            }
          }}
        >
          <button
            type="button"
            onClick={closeLightbox}
            aria-label="Закрити"
            className="absolute right-4 top-4 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-2xl font-black text-white backdrop-blur transition hover:bg-white/20"
          >
            ×
          </button>

          {photos.length > 1 && (
            <>
              <button
                type="button"
                onClick={showPreviousPhoto}
                aria-label="Попередня фотографія"
                className="absolute left-3 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-3xl font-black text-white backdrop-blur transition hover:bg-white/20 sm:left-6"
              >
                ‹
              </button>

              <button
                type="button"
                onClick={showNextPhoto}
                aria-label="Наступна фотографія"
                className="absolute right-3 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-3xl font-black text-white backdrop-blur transition hover:bg-white/20 sm:right-6"
              >
                ›
              </button>
            </>
          )}

          <div className="flex max-h-full max-w-[95vw] flex-col items-center">
            <img
              src={activePhoto.image_url}
              alt={
                activePhoto.alt_text ||
                activePhoto.caption ||
                `${album.title} — фото ${activePhotoIndex + 1}`
              }
              className="max-h-[82vh] max-w-full object-contain"
            />

            <div className="mt-4 max-w-3xl text-center text-white">
              <p className="text-sm font-black text-slate-300">
                {activePhotoIndex + 1} / {photos.length}
              </p>

              {activePhoto.caption && (
                <p className="mt-2 leading-6 text-white">
                  {activePhoto.caption}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
