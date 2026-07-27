"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { supabase } from "@/lib/supabase";

type AlbumStatus = "draft" | "published";
type StatusFilter = "all" | AlbumStatus;
type SortOption = "newest" | "oldest" | "title" | "photos" | "featured";

type GalleryAlbumRow = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  event_date: string | null;
  season: string | null;
  cover_url: string | null;
  status: AlbumStatus;
  is_featured: boolean;
  competition_id: string | null;
  match_id: string | null;
  news_id: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
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
};

type AlbumCardData = GalleryAlbumRow & {
  photoCount: number;
  competitionName: string | null;
  matchName: string | null;
  newsTitle: string | null;
};

function formatDate(value: string | null) {
  if (!value) {
    return "Дата не вказана";
  }

  return new Intl.DateTimeFormat("uk-UA", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Kyiv",
  }).format(new Date(value));
}

function getStoragePathFromPublicUrl(url: string) {
  const marker = "/storage/v1/object/public/gallery-photos/";
  const markerIndex = url.indexOf(marker);

  if (markerIndex === -1) {
    return null;
  }

  return decodeURIComponent(url.slice(markerIndex + marker.length));
}

export default function AdminGalleryPage() {
  const [albums, setAlbums] = useState<GalleryAlbumRow[]>([]);
  const [photos, setPhotos] = useState<GalleryPhotoRow[]>([]);
  const [competitions, setCompetitions] = useState<CompetitionRow[]>([]);
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [opponents, setOpponents] = useState<OpponentRow[]>([]);
  const [news, setNews] = useState<NewsRow[]>([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [seasonFilter, setSeasonFilter] = useState("all");
  const [sortOption, setSortOption] = useState<SortOption>("newest");

  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "">("");

  async function loadData(showLoader = false) {
    if (showLoader) {
      setIsLoading(true);
    }

    const [
      { data: albumData, error: albumError },
      { data: photoData, error: photoError },
      { data: competitionData, error: competitionError },
      { data: matchData, error: matchError },
      { data: opponentData, error: opponentError },
      { data: newsData, error: newsError },
    ] = await Promise.all([
      supabase
        .from("gallery_albums")
        .select(
          "id, title, slug, description, event_date, season, cover_url, status, is_featured, competition_id, match_id, news_id, published_at, created_at, updated_at",
        )
        .order("created_at", { ascending: false }),

      supabase.from("gallery_photos").select("id, album_id"),

      supabase.from("competitions").select("id, name, season"),

      supabase
        .from("matches")
        .select(
          "id, opponent_id, olimp_score, opponent_score, starts_at, match_date",
        ),

      supabase.from("opponents").select("id, name"),

      supabase.from("news").select("id, title"),
    ]);

    if (
      albumError ||
      photoError ||
      competitionError ||
      matchError ||
      opponentError ||
      newsError
    ) {
      console.error("Gallery loading error:", {
        albumError,
        photoError,
        competitionError,
        matchError,
        opponentError,
        newsError,
      });

      setMessage("Не вдалося завантажити дані галереї.");
      setMessageType("error");
      setIsLoading(false);
      return;
    }

    setAlbums((albumData ?? []) as GalleryAlbumRow[]);
    setPhotos((photoData ?? []) as GalleryPhotoRow[]);
    setCompetitions((competitionData ?? []) as CompetitionRow[]);
    setMatches((matchData ?? []) as MatchRow[]);
    setOpponents((opponentData ?? []) as OpponentRow[]);
    setNews((newsData ?? []) as NewsRow[]);
    setIsLoading(false);
  }

  useEffect(() => {
    void loadData(true);

    const channel = supabase
      .channel("olimp-admin-gallery-list")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "gallery_albums",
        },
        () => void loadData(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "gallery_photos",
        },
        () => void loadData(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const competitionById = useMemo(
    () =>
      new Map(competitions.map((competition) => [competition.id, competition])),
    [competitions],
  );

  const opponentById = useMemo(
    () => new Map(opponents.map((opponent) => [opponent.id, opponent])),
    [opponents],
  );

  const matchById = useMemo(
    () => new Map(matches.map((match) => [match.id, match])),
    [matches],
  );

  const newsById = useMemo(
    () => new Map(news.map((item) => [item.id, item])),
    [news],
  );

  const photoCountByAlbum = useMemo(() => {
    const result = new Map<string, number>();

    photos.forEach((photo) => {
      result.set(photo.album_id, (result.get(photo.album_id) ?? 0) + 1);
    });

    return result;
  }, [photos]);

  const enrichedAlbums = useMemo<AlbumCardData[]>(() => {
    return albums.map((album) => {
      const competition = album.competition_id
        ? competitionById.get(album.competition_id)
        : null;

      const match = album.match_id ? matchById.get(album.match_id) : null;

      const opponent = match?.opponent_id
        ? opponentById.get(match.opponent_id)
        : null;

      const matchName = match
        ? `Олімп Футзал ${
            match.olimp_score !== null && match.opponent_score !== null
              ? `${match.olimp_score}:${match.opponent_score}`
              : "—"
          } ${opponent?.name ?? "Суперник"}`
        : null;

      const linkedNews = album.news_id ? newsById.get(album.news_id) : null;

      return {
        ...album,
        photoCount: photoCountByAlbum.get(album.id) ?? 0,
        competitionName: competition
          ? `${competition.name}${
              competition.season ? ` · ${competition.season}` : ""
            }`
          : null,
        matchName,
        newsTitle: linkedNews?.title ?? null,
      };
    });
  }, [
    albums,
    competitionById,
    matchById,
    newsById,
    opponentById,
    photoCountByAlbum,
  ]);

  const statistics = useMemo(() => {
    return {
      totalAlbums: albums.length,
      totalPhotos: photos.length,
      published: albums.filter((album) => album.status === "published").length,
      drafts: albums.filter((album) => album.status === "draft").length,
    };
  }, [albums, photos]);

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

    const result = enrichedAlbums.filter((album) => {
      if (statusFilter !== "all" && album.status !== statusFilter) {
        return false;
      }

      if (seasonFilter !== "all" && album.season !== seasonFilter) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const searchableText = [
        album.title,
        album.slug,
        album.description ?? "",
        album.season ?? "",
        album.competitionName ?? "",
        album.matchName ?? "",
        album.newsTitle ?? "",
      ]
        .join(" ")
        .toLocaleLowerCase("uk-UA");

      return searchableText.includes(normalizedSearch);
    });

    return result.sort((first, second) => {
      if (sortOption === "oldest") {
        return (
          new Date(first.created_at).getTime() -
          new Date(second.created_at).getTime()
        );
      }

      if (sortOption === "title") {
        return first.title.localeCompare(second.title, "uk");
      }

      if (sortOption === "photos") {
        if (second.photoCount !== first.photoCount) {
          return second.photoCount - first.photoCount;
        }

        return (
          new Date(second.created_at).getTime() -
          new Date(first.created_at).getTime()
        );
      }

      if (sortOption === "featured") {
        if (first.is_featured !== second.is_featured) {
          return Number(second.is_featured) - Number(first.is_featured);
        }

        return (
          new Date(second.created_at).getTime() -
          new Date(first.created_at).getTime()
        );
      }

      return (
        new Date(second.created_at).getTime() -
        new Date(first.created_at).getTime()
      );
    });
  }, [enrichedAlbums, searchQuery, seasonFilter, sortOption, statusFilter]);

  async function togglePublication(album: AlbumCardData) {
    setBusyId(album.id);
    setMessage("");
    setMessageType("");

    const nextStatus: AlbumStatus =
      album.status === "published" ? "draft" : "published";

    const { error } = await supabase
      .from("gallery_albums")
      .update({
        status: nextStatus,
        published_at:
          nextStatus === "published"
            ? (album.published_at ?? new Date().toISOString())
            : album.published_at,
      })
      .eq("id", album.id);

    if (error) {
      console.error("Gallery publication update error:", error);
      setMessage("Не вдалося змінити статус альбому.");
      setMessageType("error");
      setBusyId(null);
      return;
    }

    setMessage(
      nextStatus === "published"
        ? "Альбом опубліковано."
        : "Альбом переведено у чернетки.",
    );
    setMessageType("success");
    setBusyId(null);

    await loadData();
  }

  async function toggleFeatured(album: AlbumCardData) {
    setBusyId(album.id);
    setMessage("");
    setMessageType("");

    const { error } = await supabase
      .from("gallery_albums")
      .update({
        is_featured: !album.is_featured,
      })
      .eq("id", album.id);

    if (error) {
      console.error("Gallery featured update error:", error);
      setMessage("Не вдалося змінити статус закріплення.");
      setMessageType("error");
      setBusyId(null);
      return;
    }

    setMessage(
      album.is_featured ? "Альбом відкріплено." : "Альбом закріплено.",
    );
    setMessageType("success");
    setBusyId(null);

    await loadData();
  }

  async function deleteAlbum(album: AlbumCardData) {
    const confirmed = window.confirm(
      `Видалити альбом «${album.title}» разом із ${album.photoCount} фото? Цю дію неможливо скасувати.`,
    );

    if (!confirmed) {
      return;
    }

    setBusyId(album.id);
    setMessage("");
    setMessageType("");

    try {
      const { data: albumPhotos, error: photoLoadError } = await supabase
        .from("gallery_photos")
        .select("storage_path")
        .eq("album_id", album.id);

      if (photoLoadError) {
        throw photoLoadError;
      }

      const storagePaths = (albumPhotos ?? [])
        .map((photo) => photo.storage_path)
        .filter(Boolean);

      if (storagePaths.length > 0) {
        const { error: storageError } = await supabase.storage
          .from("gallery-photos")
          .remove(storagePaths);

        if (storageError) {
          console.warn("Gallery storage removal warning:", storageError);
        }
      } else if (album.cover_url) {
        const coverPath = getStoragePathFromPublicUrl(album.cover_url);

        if (coverPath) {
          const { error: coverRemovalError } = await supabase.storage
            .from("gallery-photos")
            .remove([coverPath]);

          if (coverRemovalError) {
            console.warn("Gallery cover removal warning:", coverRemovalError);
          }
        }
      }

      const { error } = await supabase
        .from("gallery_albums")
        .delete()
        .eq("id", album.id);

      if (error) {
        throw error;
      }

      setMessage("Альбом видалено.");
      setMessageType("success");

      await loadData();
    } catch (error) {
      console.error("Gallery album deletion error:", error);

      setMessage(
        error instanceof Error ? error.message : "Не вдалося видалити альбом.",
      );
      setMessageType("error");
    } finally {
      setBusyId(null);
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[65vh] items-center justify-center">
        <div className="text-center">
          <span className="mx-auto block h-11 w-11 animate-spin rounded-full border-4 border-slate-200 border-t-sky-500" />

          <p className="mt-5 text-sm font-black uppercase tracking-[0.2em] text-sky-700">
            Завантаження галереї...
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
              Фотоісторія клубу
            </p>

            <h1 className="mt-4 text-3xl font-black sm:text-4xl">Галерея</h1>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300 sm:text-base">
              Створюйте фотоальбоми матчів, тренувань, турнірів та важливих
              подій «Олімп Футзал».
            </p>
          </div>

          <Link
            href="/admin/gallery/new"
            className="inline-flex min-h-12 items-center justify-center rounded-full bg-sky-500 px-6 font-black text-slate-950 transition hover:bg-sky-400"
          >
            + Створити альбом
          </Link>
        </div>
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

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatisticCard
          label="Усього альбомів"
          value={statistics.totalAlbums}
          accent="text-sky-600"
        />

        <StatisticCard
          label="Фотографій"
          value={statistics.totalPhotos}
          accent="text-violet-600"
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
      </section>

      <section className="mt-10">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-sky-600">
              Фотоальбоми
            </p>

            <h2 className="mt-2 text-3xl font-black text-slate-950">
              Усі альбоми
            </h2>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Пошук альбому"
              className="min-h-12 rounded-2xl border border-slate-200 bg-white px-4 font-semibold outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
            />

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as StatusFilter)
              }
              className="min-h-12 rounded-2xl border border-slate-200 bg-white px-4 font-bold outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
            >
              <option value="all">Усі статуси</option>
              <option value="published">Опубліковані</option>
              <option value="draft">Чернетки</option>
            </select>

            <select
              value={seasonFilter}
              onChange={(event) => setSeasonFilter(event.target.value)}
              className="min-h-12 rounded-2xl border border-slate-200 bg-white px-4 font-bold outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
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
              className="min-h-12 rounded-2xl border border-slate-200 bg-white px-4 font-bold outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
            >
              <option value="newest">Спочатку нові</option>
              <option value="oldest">Спочатку старі</option>
              <option value="title">За назвою</option>
              <option value="photos">За кількістю фото</option>
              <option value="featured">Спочатку закріплені</option>
            </select>
          </div>
        </div>

        {filteredAlbums.length ? (
          <div className="mt-6 grid gap-6 xl:grid-cols-2">
            {filteredAlbums.map((album) => (
              <GalleryAlbumCard
                key={album.id}
                album={album}
                isBusy={busyId === album.id}
                onTogglePublication={() => void togglePublication(album)}
                onToggleFeatured={() => void toggleFeatured(album)}
                onDelete={() => void deleteAlbum(album)}
              />
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-[2rem] border border-dashed border-slate-300 bg-white p-10 text-center">
            <p className="text-xl font-black text-slate-800">
              Альбомів за вибраними фільтрами не знайдено
            </p>

            <p className="mt-2 text-slate-500">
              Змініть фільтри або створіть перший фотоальбом.
            </p>

            <Link
              href="/admin/gallery/new"
              className="mt-6 inline-flex min-h-12 items-center justify-center rounded-full bg-slate-950 px-6 font-black text-white transition hover:bg-sky-500 hover:text-slate-950"
            >
              + Створити альбом
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

function GalleryAlbumCard({
  album,
  isBusy,
  onTogglePublication,
  onToggleFeatured,
  onDelete,
}: {
  album: AlbumCardData;
  isBusy: boolean;
  onTogglePublication: () => void;
  onToggleFeatured: () => void;
  onDelete: () => void;
}) {
  return (
    <article className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
      <div className="relative aspect-[16/9] overflow-hidden bg-slate-950">
        {album.cover_url ? (
          <img
            src={album.cover_url}
            alt=""
            className="h-full w-full object-cover transition duration-500 hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-sky-950">
            <div className="text-center text-white">
              <span className="text-5xl">📷</span>

              <p className="mt-4 text-xs font-black uppercase tracking-[0.24em] text-sky-400">
                Олімп Футзал
              </p>
            </div>
          </div>
        )}

        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
          <StatusBadge status={album.status} />

          {album.is_featured && (
            <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-black text-violet-700 shadow-sm">
              📌 ЗАКРІПЛЕНО
            </span>
          )}
        </div>

        <span className="absolute bottom-4 right-4 rounded-full bg-slate-950/80 px-4 py-2 text-sm font-black text-white backdrop-blur">
          📷 {album.photoCount}
        </span>
      </div>

      <div className="p-6">
        <div className="flex flex-wrap items-center gap-2 text-xs font-black text-slate-500">
          {album.season && (
            <span className="rounded-full bg-sky-100 px-3 py-1 text-sky-700">
              {album.season}
            </span>
          )}

          <span>{formatDate(album.event_date)}</span>
        </div>

        <h3 className="mt-4 text-2xl font-black leading-tight text-slate-950">
          {album.title}
        </h3>

        <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">
          {album.description?.trim() || "Опис альбому ще не додано."}
        </p>

        <div className="mt-5 space-y-2 rounded-2xl bg-slate-50 p-4 text-sm">
          {album.competitionName && (
            <p className="flex gap-3">
              <span>🏆</span>
              <span className="font-semibold text-slate-700">
                {album.competitionName}
              </span>
            </p>
          )}

          {album.matchName && (
            <p className="flex gap-3">
              <span>⚽</span>
              <span className="font-semibold text-slate-700">
                {album.matchName}
              </span>
            </p>
          )}

          {album.newsTitle && (
            <p className="flex gap-3">
              <span>📰</span>
              <span className="line-clamp-1 font-semibold text-slate-700">
                {album.newsTitle}
              </span>
            </p>
          )}

          {!album.competitionName && !album.matchName && !album.newsTitle && (
            <p className="text-slate-500">
              Альбом поки не прив’язаний до інших матеріалів.
            </p>
          )}
        </div>

        <p className="mt-4 break-all text-xs font-bold text-slate-400">
          /gallery/{album.slug}
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            href={`/admin/gallery/${album.id}`}
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-slate-950 px-5 text-sm font-black text-white transition hover:bg-sky-500 hover:text-slate-950"
          >
            Редагувати
          </Link>

          <button
            type="button"
            disabled={isBusy}
            onClick={onTogglePublication}
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-300 px-5 text-sm font-black text-slate-700 transition enabled:hover:border-emerald-300 enabled:hover:bg-emerald-50 enabled:hover:text-emerald-700 disabled:opacity-50"
          >
            {album.status === "published" ? "У чернетки" : "Опублікувати"}
          </button>

          <button
            type="button"
            disabled={isBusy}
            onClick={onToggleFeatured}
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-300 px-5 text-sm font-black text-slate-700 transition enabled:hover:border-violet-300 enabled:hover:bg-violet-50 enabled:hover:text-violet-700 disabled:opacity-50"
          >
            {album.is_featured ? "Відкріпити" : "Закріпити"}
          </button>

          <button
            type="button"
            disabled={isBusy}
            onClick={onDelete}
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-red-200 px-5 text-sm font-black text-red-600 transition enabled:hover:bg-red-50 disabled:opacity-50"
          >
            Видалити
          </button>
        </div>
      </div>
    </article>
  );
}

function StatusBadge({ status }: { status: AlbumStatus }) {
  if (status === "published") {
    return (
      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700 shadow-sm">
        ОПУБЛІКОВАНО
      </span>
    );
  }

  return (
    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-700 shadow-sm">
      ЧЕРНЕТКА
    </span>
  );
}
