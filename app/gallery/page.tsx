"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
};

type OpponentRow = {
  id: string;
  name: string;
};

type PublicAlbum = GalleryAlbumRow & {
  photoCount: number;
  competitionName: string | null;
  matchName: string | null;
};

type SortOption = "featured" | "newest" | "oldest" | "photos" | "title";

function formatDate(value: string | null) {
  if (!value) return "";

  return new Intl.DateTimeFormat("uk-UA", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Kyiv",
  }).format(new Date(value));
}

export default function PublicGalleryPage() {
  const [albums, setAlbums] = useState<GalleryAlbumRow[]>([]);
  const [photos, setPhotos] = useState<GalleryPhotoRow[]>([]);
  const [competitions, setCompetitions] = useState<CompetitionRow[]>([]);
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [opponents, setOpponents] = useState<OpponentRow[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [seasonFilter, setSeasonFilter] = useState("all");
  const [sortOption, setSortOption] = useState<SortOption>("featured");
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadGallery() {
      setIsLoading(true);
      setHasError(false);

      const now = new Date().toISOString();

      const [
        { data: albumData, error: albumError },
        { data: photoData, error: photoError },
        { data: competitionData, error: competitionError },
        { data: matchData, error: matchError },
        { data: opponentData, error: opponentError },
      ] = await Promise.all([
        supabase
          .from("gallery_albums")
          .select(
            "id, title, slug, description, event_date, season, cover_url, status, is_featured, competition_id, match_id, news_id, published_at, created_at",
          )
          .eq("status", "published")
          .lte("published_at", now)
          .order("is_featured", { ascending: false })
          .order("event_date", { ascending: false, nullsFirst: false })
          .order("created_at", { ascending: false }),

        supabase.from("gallery_photos").select("id, album_id"),
        supabase.from("competitions").select("id, name, season"),
        supabase
          .from("matches")
          .select("id, opponent_id, olimp_score, opponent_score"),
        supabase.from("opponents").select("id, name"),
      ]);

      if (!isMounted) return;

      if (
        albumError ||
        photoError ||
        competitionError ||
        matchError ||
        opponentError
      ) {
        console.error("Public gallery loading error:", {
          albumError,
          photoError,
          competitionError,
          matchError,
          opponentError,
        });
        setHasError(true);
      }

      setAlbums((albumData ?? []) as GalleryAlbumRow[]);
      setPhotos((photoData ?? []) as GalleryPhotoRow[]);
      setCompetitions((competitionData ?? []) as CompetitionRow[]);
      setMatches((matchData ?? []) as MatchRow[]);
      setOpponents((opponentData ?? []) as OpponentRow[]);
      setIsLoading(false);
    }

    void loadGallery();

    return () => {
      isMounted = false;
    };
  }, []);

  const photoCountByAlbum = useMemo(() => {
    const map = new Map<string, number>();

    photos.forEach((photo) => {
      map.set(photo.album_id, (map.get(photo.album_id) ?? 0) + 1);
    });

    return map;
  }, [photos]);

  const competitionById = useMemo(
    () =>
      new Map(competitions.map((competition) => [competition.id, competition])),
    [competitions],
  );

  const matchById = useMemo(
    () => new Map(matches.map((match) => [match.id, match])),
    [matches],
  );

  const opponentById = useMemo(
    () => new Map(opponents.map((opponent) => [opponent.id, opponent])),
    [opponents],
  );

  const publicAlbums = useMemo<PublicAlbum[]>(() => {
    return albums.map((album) => {
      const competition = album.competition_id
        ? competitionById.get(album.competition_id)
        : null;

      const match = album.match_id ? matchById.get(album.match_id) : null;

      const opponent = match?.opponent_id
        ? opponentById.get(match.opponent_id)
        : null;

      const score =
        match && match.olimp_score !== null && match.opponent_score !== null
          ? `${match.olimp_score}:${match.opponent_score}`
          : null;

      return {
        ...album,
        photoCount: photoCountByAlbum.get(album.id) ?? 0,
        competitionName: competition?.name ?? null,
        matchName: match
          ? `Олімп Футзал ${score ? `${score} ` : "— "}${
              opponent?.name ?? "Суперник"
            }`
          : null,
      };
    });
  }, [albums, competitionById, matchById, opponentById, photoCountByAlbum]);

  const seasonOptions = useMemo(() => {
    return Array.from(
      new Set(
        albums
          .map((album) => album.season?.trim())
          .filter((season): season is string => Boolean(season)),
      ),
    ).sort((first, second) => second.localeCompare(first, "uk"));
  }, [albums]);

  const filteredAlbums = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLocaleLowerCase("uk-UA");

    const result = publicAlbums.filter((album) => {
      if (seasonFilter !== "all" && album.season !== seasonFilter) {
        return false;
      }

      if (!normalizedSearch) return true;

      return [
        album.title,
        album.description ?? "",
        album.season ?? "",
        album.competitionName ?? "",
        album.matchName ?? "",
      ]
        .join(" ")
        .toLocaleLowerCase("uk-UA")
        .includes(normalizedSearch);
    });

    return result.sort((first, second) => {
      const firstDate = new Date(
        first.event_date ?? first.created_at,
      ).getTime();
      const secondDate = new Date(
        second.event_date ?? second.created_at,
      ).getTime();

      if (sortOption === "newest") return secondDate - firstDate;
      if (sortOption === "oldest") return firstDate - secondDate;
      if (sortOption === "photos") return second.photoCount - first.photoCount;
      if (sortOption === "title") {
        return first.title.localeCompare(second.title, "uk");
      }

      if (first.is_featured !== second.is_featured) {
        return Number(second.is_featured) - Number(first.is_featured);
      }

      return secondDate - firstDate;
    });
  }, [publicAlbums, searchQuery, seasonFilter, sortOption]);

  const totalPhotos = useMemo(
    () => publicAlbums.reduce((sum, album) => sum + album.photoCount, 0),
    [publicAlbums],
  );

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-50 px-5 py-10">
        <div className="mx-auto flex min-h-[75vh] max-w-7xl items-center justify-center">
          <div className="text-center">
            <span className="mx-auto block h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-sky-500" />
            <p className="mt-5 text-sm font-black uppercase tracking-[0.22em] text-sky-700">
              Завантаження галереї...
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
            Фотоісторія клубу
          </p>

          <h1 className="mt-4 max-w-4xl text-5xl font-black leading-tight sm:text-6xl lg:text-7xl">
            Галерея
          </h1>

          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300 sm:text-xl">
            Матчі, турніри, тренування та найважливіші моменти з життя «Олімп
            Футзал».
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <span className="rounded-full bg-white/10 px-4 py-2 text-sm font-black text-white">
              {publicAlbums.length}{" "}
              {publicAlbums.length === 1 ? "альбом" : "альбомів"}
            </span>

            <span className="rounded-full bg-white/10 px-4 py-2 text-sm font-black text-white">
              {totalPhotos} фото
            </span>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
        {hasError && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 font-semibold text-amber-800">
            Частину даних не вдалося завантажити. Спробуйте оновити сторінку.
          </div>
        )}

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_240px_240px]">
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Пошук альбому"
            className="min-h-14 rounded-2xl border border-slate-200 bg-white px-5 font-semibold outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
          />

          <select
            value={seasonFilter}
            onChange={(event) => setSeasonFilter(event.target.value)}
            className="min-h-14 rounded-2xl border border-slate-200 bg-white px-5 font-bold outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
          >
            <option value="all">Усі сезони</option>
            {seasonOptions.map((season) => (
              <option key={season} value={season}>
                {season}
              </option>
            ))}
          </select>

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
            <option value="photos">Найбільше фото</option>
            <option value="title">За назвою</option>
          </select>
        </div>

        {filteredAlbums.length ? (
          <div className="mt-8 grid gap-7 md:grid-cols-2 xl:grid-cols-3">
            {filteredAlbums.map((album) => (
              <AlbumCard key={album.id} album={album} />
            ))}
          </div>
        ) : (
          <div className="mt-8 rounded-[2rem] border border-dashed border-slate-300 bg-white p-10 text-center">
            <p className="text-2xl font-black text-slate-900">
              Альбомів не знайдено
            </p>
            <p className="mt-3 text-slate-500">
              Змініть пошуковий запит або виберіть інший сезон.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setSeasonFilter("all");
              }}
              className="mt-6 inline-flex min-h-12 items-center justify-center rounded-full bg-slate-950 px-6 font-black text-white transition hover:bg-sky-500 hover:text-slate-950"
            >
              Скинути фільтри
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

function AlbumCard({ album }: { album: PublicAlbum }) {
  return (
    <article className="group overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl">
      <Link href={`/gallery/${album.slug}`} className="block">
        <div className="relative aspect-[4/3] overflow-hidden bg-slate-950">
          {album.cover_url ? (
            <img
              src={album.cover_url}
              alt={album.title}
              loading="lazy"
              className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-sky-950 text-center text-white">
              <div>
                <span className="text-6xl">📷</span>
                <p className="mt-5 text-xs font-black uppercase tracking-[0.24em] text-sky-400">
                  Олімп Футзал
                </p>
              </div>
            </div>
          )}

          <div className="absolute left-4 top-4 flex flex-wrap gap-2">
            {album.is_featured && (
              <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-black text-violet-700 shadow-sm">
                📌 ГОЛОВНИЙ
              </span>
            )}

            {album.season && (
              <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-black text-sky-700 shadow-sm">
                {album.season}
              </span>
            )}
          </div>

          <span className="absolute bottom-4 right-4 rounded-full bg-slate-950/80 px-4 py-2 text-sm font-black text-white backdrop-blur">
            📷 {album.photoCount}
          </span>
        </div>

        <div className="p-6">
          {album.event_date && (
            <p className="text-sm font-bold text-slate-500">
              {formatDate(album.event_date)}
            </p>
          )}

          <h2 className="mt-3 text-2xl font-black leading-tight text-slate-950">
            {album.title}
          </h2>

          <p className="mt-3 line-clamp-3 min-h-[4.5rem] text-sm leading-6 text-slate-600">
            {album.description?.trim() || "Фотоальбом «Олімп Футзал»."}
          </p>

          {(album.competitionName || album.matchName) && (
            <div className="mt-5 space-y-2 rounded-2xl bg-slate-50 p-4 text-sm">
              {album.competitionName && (
                <p className="flex gap-3 font-semibold text-slate-700">
                  <span>🏆</span>
                  <span>{album.competitionName}</span>
                </p>
              )}

              {album.matchName && (
                <p className="flex gap-3 font-semibold text-slate-700">
                  <span>⚽</span>
                  <span>{album.matchName}</span>
                </p>
              )}
            </div>
          )}

          <span className="mt-6 inline-flex items-center gap-2 font-black text-sky-600 transition group-hover:gap-3">
            Переглянути альбом
            <span aria-hidden="true">→</span>
          </span>
        </div>
      </Link>
    </article>
  );
}
