"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
} from "react";

import { supabase } from "@/lib/supabase";

type AlbumStatus = "draft" | "published";

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
  image_url: string;
  storage_path: string;
  caption: string | null;
  alt_text: string | null;
  sort_order: number;
  width: number | null;
  height: number | null;
  file_size: number | null;
  is_cover: boolean;
  created_at: string;
  updated_at: string;
};

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
  publishedAt: string | null;
};

type UploadProgress = {
  current: number;
  total: number;
  currentName: string;
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

function formatDate(value: string | null) {
  if (!value) {
    return "Не вказано";
  }

  return new Intl.DateTimeFormat("uk-UA", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: value.includes("T") ? "2-digit" : undefined,
    minute: value.includes("T") ? "2-digit" : undefined,
    timeZone: "Europe/Kyiv",
  }).format(new Date(value));
}

function formatFileSize(value: number | null) {
  if (!value) {
    return "";
  }

  if (value < 1024 * 1024) {
    return `${Math.round(value / 1024)} KB`;
  }

  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function sanitizeFileName(value: string) {
  const extension = value.includes(".")
    ? value.split(".").pop()?.toLocaleLowerCase()
    : "jpg";

  const baseName = value
    .replace(/\.[^/.]+$/, "")
    .toLocaleLowerCase()
    .replace(/[^a-z0-9а-яіїєґ_-]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);

  return `${createSlug(baseName) || "photo"}.${extension || "jpg"}`;
}

function getImageDimensions(file: File) {
  return new Promise<{ width: number; height: number }>((resolve) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      resolve({
        width: image.naturalWidth,
        height: image.naturalHeight,
      });

      URL.revokeObjectURL(objectUrl);
    };

    image.onerror = () => {
      resolve({
        width: 0,
        height: 0,
      });

      URL.revokeObjectURL(objectUrl);
    };

    image.src = objectUrl;
  });
}

export default function EditGalleryAlbumPage() {
  const params = useParams<{ albumId: string }>();
  const albumId = params.albumId;
  const router = useRouter();

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [album, setAlbum] = useState<GalleryAlbumRow | null>(null);
  const [form, setForm] = useState<AlbumFormState | null>(null);
  const [photos, setPhotos] = useState<GalleryPhotoRow[]>([]);

  const [competitions, setCompetitions] = useState<CompetitionRow[]>([]);
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [opponents, setOpponents] = useState<OpponentRow[]>([]);
  const [news, setNews] = useState<NewsRow[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [busyPhotoId, setBusyPhotoId] = useState<string | null>(null);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);

  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(
    null,
  );

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "">("");

  const loadData = useCallback(
    async (showLoader = false) => {
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
          .eq("id", albumId)
          .single(),

        supabase
          .from("gallery_photos")
          .select(
            "id, album_id, image_url, storage_path, caption, alt_text, sort_order, width, height, file_size, is_cover, created_at, updated_at",
          )
          .eq("album_id", albumId)
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: true }),

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

      if (
        albumError ||
        photoError ||
        competitionError ||
        matchError ||
        opponentError ||
        newsError
      ) {
        console.error("Gallery album loading error:", {
          albumError,
          photoError,
          competitionError,
          matchError,
          opponentError,
          newsError,
        });

        setMessage("Не вдалося завантажити дані альбому.");
        setMessageType("error");
      }

      if (albumData) {
        const loadedAlbum = albumData as GalleryAlbumRow;

        setAlbum(loadedAlbum);
        setForm({
          title: loadedAlbum.title,
          slug: loadedAlbum.slug,
          description: loadedAlbum.description ?? "",
          eventDate: loadedAlbum.event_date ?? "",
          season: loadedAlbum.season ?? "",
          competitionId: loadedAlbum.competition_id ?? "",
          matchId: loadedAlbum.match_id ?? "",
          newsId: loadedAlbum.news_id ?? "",
          status: loadedAlbum.status,
          isFeatured: loadedAlbum.is_featured,
          publishedAt: loadedAlbum.published_at,
        });
      }

      setPhotos((photoData ?? []) as GalleryPhotoRow[]);
      setCompetitions((competitionData ?? []) as CompetitionRow[]);
      setMatches((matchData ?? []) as MatchRow[]);
      setOpponents((opponentData ?? []) as OpponentRow[]);
      setNews((newsData ?? []) as NewsRow[]);
      setIsLoading(false);
    },
    [albumId],
  );

  useEffect(() => {
    void loadData(true);
  }, [loadData]);

  const opponentById = useMemo(
    () => new Map(opponents.map((opponent) => [opponent.id, opponent.name])),
    [opponents],
  );

  const filteredMatches = useMemo(() => {
    if (!form?.competitionId) {
      return matches;
    }

    return matches.filter(
      (match) => match.competition_id === form.competitionId,
    );
  }, [form?.competitionId, matches]);

  const hasChanges = useMemo(() => {
    if (!album || !form) {
      return false;
    }

    return (
      form.title !== album.title ||
      form.slug !== album.slug ||
      form.description !== (album.description ?? "") ||
      form.eventDate !== (album.event_date ?? "") ||
      form.season !== (album.season ?? "") ||
      form.competitionId !== (album.competition_id ?? "") ||
      form.matchId !== (album.match_id ?? "") ||
      form.newsId !== (album.news_id ?? "") ||
      form.status !== album.status ||
      form.isFeatured !== album.is_featured
    );
  }, [album, form]);

  function updateForm<Key extends keyof AlbumFormState>(
    key: Key,
    value: AlbumFormState[Key],
  ) {
    setForm((current) =>
      current
        ? {
            ...current,
            [key]: value,
          }
        : current,
    );
  }

  function handleCompetitionChange(value: string) {
    const competition = competitions.find((item) => item.id === value);

    setForm((current) => {
      if (!current) {
        return current;
      }

      const selectedMatchStillValid =
        !current.matchId ||
        matches.some(
          (match) =>
            match.id === current.matchId && match.competition_id === value,
        );

      return {
        ...current,
        competitionId: value,
        matchId: selectedMatchStillValid ? current.matchId : "",
        season: current.season || competition?.season || "",
      };
    });
  }

  function handleMatchChange(value: string) {
    const match = matches.find((item) => item.id === value);

    setForm((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        matchId: value,
        competitionId: current.competitionId || match?.competition_id || "",
        eventDate:
          current.eventDate ||
          (match?.starts_at ?? match?.match_date ?? "").slice(0, 10),
      };
    });
  }

  async function saveAlbum(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form) {
      return;
    }

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
        .neq("id", albumId)
        .maybeSingle();

      if (slugCheckError) {
        throw slugCheckError;
      }

      if (existingAlbum) {
        throw new Error("Альбом із таким slug уже існує. Змініть адресу.");
      }

      const publishedAt =
        form.status === "published"
          ? (form.publishedAt ?? new Date().toISOString())
          : form.publishedAt;

      const { error } = await supabase
        .from("gallery_albums")
        .update({
          title,
          slug,
          description: description || null,
          event_date: form.eventDate || null,
          season: season || null,
          status: form.status,
          is_featured: form.isFeatured,
          competition_id: form.competitionId || null,
          match_id: form.matchId || null,
          news_id: form.newsId || null,
          published_at: publishedAt,
        })
        .eq("id", albumId);

      if (error) {
        throw error;
      }

      setMessage("Зміни альбому збережено.");
      setMessageType("success");

      await loadData();
    } catch (error) {
      console.error("Gallery album update error:", error);

      setMessage(
        error instanceof Error ? error.message : "Не вдалося оновити альбом.",
      );
      setMessageType("error");
    } finally {
      setIsSaving(false);
    }
  }

  async function uploadFiles(files: File[]) {
    const validFiles = files.filter((file) => file.type.startsWith("image/"));

    if (!validFiles.length) {
      setMessage("Оберіть файли зображень.");
      setMessageType("error");
      return;
    }

    const oversized = validFiles.find((file) => file.size > 20 * 1024 * 1024);

    if (oversized) {
      setMessage(`Файл «${oversized.name}» перевищує дозволений розмір 20 MB.`);
      setMessageType("error");
      return;
    }

    setIsUploading(true);
    setMessage("");
    setMessageType("");

    let uploadedCount = 0;
    const uploadedPaths: string[] = [];

    try {
      const firstSortOrder =
        photos.reduce(
          (maximum, photo) => Math.max(maximum, photo.sort_order),
          -1,
        ) + 1;

      for (let index = 0; index < validFiles.length; index += 1) {
        const file = validFiles[index];

        setUploadProgress({
          current: index + 1,
          total: validFiles.length,
          currentName: file.name,
        });

        const safeFileName = sanitizeFileName(file.name);
        const storagePath = `${albumId}/${Date.now()}-${crypto.randomUUID()}-${safeFileName}`;

        const { error: uploadError } = await supabase.storage
          .from("gallery-photos")
          .upload(storagePath, file, {
            cacheControl: "3600",
            upsert: false,
            contentType: file.type,
          });

        if (uploadError) {
          throw uploadError;
        }

        uploadedPaths.push(storagePath);

        const { data: publicUrlData } = supabase.storage
          .from("gallery-photos")
          .getPublicUrl(storagePath);

        const dimensions = await getImageDimensions(file);

        const { error: insertError } = await supabase
          .from("gallery_photos")
          .insert({
            album_id: albumId,
            image_url: publicUrlData.publicUrl,
            storage_path: storagePath,
            caption: null,
            alt_text: form?.title
              ? `${form.title} — фото ${firstSortOrder + index + 1}`
              : null,
            sort_order: firstSortOrder + index,
            width: dimensions.width || null,
            height: dimensions.height || null,
            file_size: file.size,
            is_cover: photos.length === 0 && index === 0,
          });

        if (insertError) {
          throw insertError;
        }

        uploadedCount += 1;
      }

      setMessage(`Завантажено фотографій: ${uploadedCount}.`);
      setMessageType("success");

      await loadData();
    } catch (error) {
      console.error("Gallery photos upload error:", error);

      setMessage(
        error instanceof Error
          ? error.message
          : "Не вдалося завершити завантаження фотографій.",
      );
      setMessageType("error");

      if (uploadedPaths.length > uploadedCount) {
        const orphanPaths = uploadedPaths.slice(uploadedCount);

        if (orphanPaths.length) {
          await supabase.storage.from("gallery-photos").remove(orphanPaths);
        }
      }

      await loadData();
    } finally {
      setIsUploading(false);
      setUploadProgress(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  function handleFileInput(event: ChangeEvent<HTMLInputElement>) {
    void uploadFiles(Array.from(event.target.files ?? []));
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDraggingFiles(false);

    if (isUploading) {
      return;
    }

    void uploadFiles(Array.from(event.dataTransfer.files));
  }

  async function setAsCover(photo: GalleryPhotoRow) {
    setBusyPhotoId(photo.id);
    setMessage("");
    setMessageType("");

    try {
      const { error: clearError } = await supabase
        .from("gallery_photos")
        .update({ is_cover: false })
        .eq("album_id", albumId)
        .eq("is_cover", true);

      if (clearError) {
        throw clearError;
      }

      const { error } = await supabase
        .from("gallery_photos")
        .update({ is_cover: true })
        .eq("id", photo.id);

      if (error) {
        throw error;
      }

      setMessage("Обкладинку альбому оновлено.");
      setMessageType("success");

      await loadData();
    } catch (error) {
      console.error("Gallery cover update error:", error);

      setMessage(
        error instanceof Error
          ? error.message
          : "Не вдалося змінити обкладинку.",
      );
      setMessageType("error");
    } finally {
      setBusyPhotoId(null);
    }
  }

  async function updatePhotoText(
    photoId: string,
    field: "caption" | "alt_text",
    value: string,
  ) {
    const { error } = await supabase
      .from("gallery_photos")
      .update({
        [field]: value.trim() || null,
      })
      .eq("id", photoId);

    if (error) {
      console.error("Gallery photo text update error:", error);
      setMessage("Не вдалося оновити підпис фотографії.");
      setMessageType("error");
      return;
    }

    setPhotos((current) =>
      current.map((photo) =>
        photo.id === photoId
          ? {
              ...photo,
              [field]: value.trim() || null,
            }
          : photo,
      ),
    );
  }

  async function movePhoto(
    photo: GalleryPhotoRow,
    direction: "left" | "right",
  ) {
    const currentIndex = photos.findIndex((item) => item.id === photo.id);

    const nextIndex =
      direction === "left" ? currentIndex - 1 : currentIndex + 1;

    if (currentIndex === -1 || nextIndex < 0 || nextIndex >= photos.length) {
      return;
    }

    const otherPhoto = photos[nextIndex];

    setBusyPhotoId(photo.id);

    try {
      const temporaryOrder = -999999;

      const { error: firstError } = await supabase
        .from("gallery_photos")
        .update({ sort_order: temporaryOrder })
        .eq("id", photo.id);

      if (firstError) {
        throw firstError;
      }

      const { error: secondError } = await supabase
        .from("gallery_photos")
        .update({ sort_order: photo.sort_order })
        .eq("id", otherPhoto.id);

      if (secondError) {
        throw secondError;
      }

      const { error: thirdError } = await supabase
        .from("gallery_photos")
        .update({ sort_order: otherPhoto.sort_order })
        .eq("id", photo.id);

      if (thirdError) {
        throw thirdError;
      }

      await loadData();
    } catch (error) {
      console.error("Gallery photo reorder error:", error);

      setMessage(
        error instanceof Error
          ? error.message
          : "Не вдалося змінити порядок фотографій.",
      );
      setMessageType("error");

      await loadData();
    } finally {
      setBusyPhotoId(null);
    }
  }

  async function deletePhoto(photo: GalleryPhotoRow) {
    const confirmed = window.confirm("Видалити цю фотографію з альбому?");

    if (!confirmed) {
      return;
    }

    setBusyPhotoId(photo.id);
    setMessage("");
    setMessageType("");

    try {
      const { error: storageError } = await supabase.storage
        .from("gallery-photos")
        .remove([photo.storage_path]);

      if (storageError) {
        console.warn("Gallery photo storage removal warning:", storageError);
      }

      const { error } = await supabase
        .from("gallery_photos")
        .delete()
        .eq("id", photo.id);

      if (error) {
        throw error;
      }

      setMessage("Фотографію видалено.");
      setMessageType("success");

      await loadData();
    } catch (error) {
      console.error("Gallery photo deletion error:", error);

      setMessage(
        error instanceof Error
          ? error.message
          : "Не вдалося видалити фотографію.",
      );
      setMessageType("error");
    } finally {
      setBusyPhotoId(null);
    }
  }

  async function deleteAlbum() {
    if (!album) {
      return;
    }

    const confirmed = window.confirm(
      `Видалити альбом «${album.title}» разом із ${photos.length} фото? Цю дію неможливо скасувати.`,
    );

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    setMessage("");
    setMessageType("");

    try {
      const storagePaths = photos.map((photo) => photo.storage_path);

      if (storagePaths.length) {
        const { error: storageError } = await supabase.storage
          .from("gallery-photos")
          .remove(storagePaths);

        if (storageError) {
          console.warn("Gallery album storage removal warning:", storageError);
        }
      }

      const { error } = await supabase
        .from("gallery_albums")
        .delete()
        .eq("id", albumId);

      if (error) {
        throw error;
      }

      router.push("/admin/gallery");
    } catch (error) {
      console.error("Gallery album deletion error:", error);

      setMessage(
        error instanceof Error ? error.message : "Не вдалося видалити альбом.",
      );
      setMessageType("error");
      setIsDeleting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[65vh] items-center justify-center">
        <div className="text-center">
          <span className="mx-auto block h-11 w-11 animate-spin rounded-full border-4 border-slate-200 border-t-sky-500" />

          <p className="mt-5 text-sm font-black uppercase tracking-[0.2em] text-sky-700">
            Завантаження альбому...
          </p>
        </div>
      </div>
    );
  }

  if (!album || !form) {
    return (
      <section className="rounded-[2rem] border border-red-200 bg-red-50 p-8">
        <h1 className="text-2xl font-black text-red-800">Альбом не знайдено</h1>

        <Link
          href="/admin/gallery"
          className="mt-5 inline-flex rounded-full bg-slate-950 px-6 py-3 font-black text-white"
        >
          ← До галереї
        </Link>
      </section>
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

        <div className="mt-6 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.26em] text-sky-400">
              Редактор фотоальбому
            </p>

            <h1 className="mt-3 text-3xl font-black sm:text-4xl">
              {album.title}
            </h1>

            <p className="mt-3 text-sm text-slate-300">
              {photos.length} фото · створено {formatDate(album.created_at)}
            </p>
          </div>

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

      <form
        onSubmit={(event) => void saveAlbum(event)}
        className="mt-8 space-y-8"
      >
        <section className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-600">
              Основна інформація
            </p>

            <div className="mt-6 space-y-5">
              <label className="block">
                <span className="text-sm font-black text-slate-700">
                  Назва *
                </span>

                <input
                  type="text"
                  value={form.title}
                  onChange={(event) => updateForm("title", event.target.value)}
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
                    onChange={(event) =>
                      updateForm("slug", createSlug(event.target.value))
                    }
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
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-600">
              Зв’язки та публікація
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
                        ? `${match.olimp_score}:${match.opponent_score}`
                        : "—";

                    return (
                      <option key={match.id} value={match.id}>
                        Олімп Футзал {score} {opponentName ?? "Суперник"} ·{" "}
                        {formatDate(match.starts_at ?? match.match_date)}
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

              <div className="grid gap-4 sm:grid-cols-2">
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
                    <strong className="block text-slate-900">Закріпити</strong>

                    <span className="mt-1 block text-sm text-slate-500">
                      Показувати серед головних
                    </span>
                  </div>
                </label>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                <p>
                  <strong className="text-slate-800">Опубліковано:</strong>{" "}
                  {formatDate(form.publishedAt)}
                </p>

                <p className="mt-2 break-all">
                  <strong className="text-slate-800">Публічна адреса:</strong>{" "}
                  /gallery/{form.slug}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-600">
                Фотографії
              </p>

              <h2 className="mt-2 text-3xl font-black text-slate-950">
                Наповнення альбому
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Завантажуйте кілька фотографій одночасно, визначайте обкладинку
                та змінюйте порядок.
              </p>
            </div>

            <button
              type="button"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-sky-500 px-6 font-black text-slate-950 transition enabled:hover:bg-sky-400 disabled:opacity-50"
            >
              + Додати фотографії
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileInput}
            className="hidden"
          />

          <div
            onDragEnter={(event) => {
              event.preventDefault();
              setIsDraggingFiles(true);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              setIsDraggingFiles(true);
            }}
            onDragLeave={(event) => {
              event.preventDefault();

              if (event.currentTarget === event.target) {
                setIsDraggingFiles(false);
              }
            }}
            onDrop={handleDrop}
            className={`mt-6 flex min-h-52 cursor-pointer flex-col items-center justify-center rounded-[2rem] border-2 border-dashed p-8 text-center transition ${
              isDraggingFiles
                ? "border-sky-500 bg-sky-50"
                : "border-slate-300 bg-slate-50 hover:border-sky-400 hover:bg-sky-50"
            }`}
            onClick={() => {
              if (!isUploading) {
                fileInputRef.current?.click();
              }
            }}
          >
            <span className="text-5xl">🖼️</span>

            <strong className="mt-4 text-xl text-slate-900">
              {isUploading
                ? "Завантаження фотографій..."
                : "Перетягніть фотографії сюди"}
            </strong>

            <p className="mt-2 text-sm text-slate-500">
              або натисніть, щоб вибрати кілька файлів
            </p>

            <p className="mt-2 text-xs font-bold text-slate-400">
              JPG, PNG або WebP · до 20 MB на один файл
            </p>

            {uploadProgress && (
              <div className="mt-6 w-full max-w-xl">
                <div className="flex justify-between gap-4 text-sm font-bold text-slate-600">
                  <span className="truncate">{uploadProgress.currentName}</span>

                  <span>
                    {uploadProgress.current}/{uploadProgress.total}
                  </span>
                </div>

                <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-sky-500 transition-all"
                    style={{
                      width: `${
                        (uploadProgress.current / uploadProgress.total) * 100
                      }%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {photos.length ? (
            <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {photos.map((photo, index) => (
                <PhotoCard
                  key={photo.id}
                  photo={photo}
                  index={index}
                  total={photos.length}
                  isBusy={busyPhotoId === photo.id}
                  onSetCover={() => void setAsCover(photo)}
                  onMoveLeft={() => void movePhoto(photo, "left")}
                  onMoveRight={() => void movePhoto(photo, "right")}
                  onDelete={() => void deletePhoto(photo)}
                  onCaptionBlur={(value) =>
                    void updatePhotoText(photo.id, "caption", value)
                  }
                  onAltBlur={(value) =>
                    void updatePhotoText(photo.id, "alt_text", value)
                  }
                />
              ))}
            </div>
          ) : (
            <div className="mt-8 rounded-[2rem] border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
              <p className="text-xl font-black text-slate-800">
                В альбомі ще немає фотографій
              </p>

              <p className="mt-2 text-slate-500">
                Перша завантажена фотографія автоматично стане обкладинкою.
              </p>
            </div>
          )}
        </section>

        <div className="sticky bottom-4 z-30 rounded-[2rem] border border-slate-200 bg-white/95 p-4 shadow-2xl backdrop-blur">
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="submit"
              disabled={isSaving || isUploading || isDeleting || !hasChanges}
              className="inline-flex min-h-14 flex-1 items-center justify-center rounded-full bg-slate-950 px-7 font-black text-white transition enabled:hover:bg-sky-500 enabled:hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? "Збереження..." : "Зберегти зміни"}
            </button>

            <button
              type="button"
              disabled={isDeleting || isUploading}
              onClick={() => void deleteAlbum()}
              className="inline-flex min-h-14 items-center justify-center rounded-full border border-red-200 px-7 font-black text-red-600 transition enabled:hover:bg-red-50 disabled:opacity-50"
            >
              {isDeleting ? "Видалення..." : "Видалити альбом"}
            </button>

            <Link
              href="/admin/gallery"
              className="inline-flex min-h-14 items-center justify-center rounded-full border border-slate-300 px-7 font-black text-slate-700 transition hover:bg-slate-100"
            >
              Повернутися
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
}

function PhotoCard({
  photo,
  index,
  total,
  isBusy,
  onSetCover,
  onMoveLeft,
  onMoveRight,
  onDelete,
  onCaptionBlur,
  onAltBlur,
}: {
  photo: GalleryPhotoRow;
  index: number;
  total: number;
  isBusy: boolean;
  onSetCover: () => void;
  onMoveLeft: () => void;
  onMoveRight: () => void;
  onDelete: () => void;
  onCaptionBlur: (value: string) => void;
  onAltBlur: (value: string) => void;
}) {
  const [caption, setCaption] = useState(photo.caption ?? "");
  const [altText, setAltText] = useState(photo.alt_text ?? "");

  useEffect(() => {
    setCaption(photo.caption ?? "");
    setAltText(photo.alt_text ?? "");
  }, [photo.alt_text, photo.caption]);

  return (
    <article className="overflow-hidden rounded-[1.6rem] border border-slate-200 bg-white shadow-sm">
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-950">
        <img
          src={photo.image_url}
          alt={photo.alt_text ?? ""}
          className="h-full w-full object-cover"
        />

        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          <span className="rounded-full bg-slate-950/80 px-3 py-1 text-xs font-black text-white backdrop-blur">
            #{index + 1}
          </span>

          {photo.is_cover && (
            <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-black text-sky-700 shadow-sm">
              ОБКЛАДИНКА
            </span>
          )}
        </div>
      </div>

      <div className="p-4">
        <div className="flex flex-wrap gap-2 text-xs font-bold text-slate-400">
          {photo.width && photo.height && (
            <span>
              {photo.width}×{photo.height}
            </span>
          )}

          {photo.file_size && <span>{formatFileSize(photo.file_size)}</span>}
        </div>

        <label className="mt-4 block">
          <span className="text-xs font-black uppercase tracking-wide text-slate-500">
            Підпис
          </span>

          <input
            type="text"
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
            onBlur={() => onCaptionBlur(caption)}
            placeholder="Необов’язковий підпис"
            className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
          />
        </label>

        <label className="mt-3 block">
          <span className="text-xs font-black uppercase tracking-wide text-slate-500">
            Alt text
          </span>

          <input
            type="text"
            value={altText}
            onChange={(event) => setAltText(event.target.value)}
            onBlur={() => onAltBlur(altText)}
            placeholder="Опис зображення"
            className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
          />
        </label>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={isBusy || index === 0}
            onClick={onMoveLeft}
            className="min-h-10 rounded-full border border-slate-200 text-sm font-black text-slate-700 transition enabled:hover:bg-slate-100 disabled:opacity-40"
          >
            ← Лівіше
          </button>

          <button
            type="button"
            disabled={isBusy || index === total - 1}
            onClick={onMoveRight}
            className="min-h-10 rounded-full border border-slate-200 text-sm font-black text-slate-700 transition enabled:hover:bg-slate-100 disabled:opacity-40"
          >
            Правіше →
          </button>
        </div>

        <div className="mt-2 grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={isBusy || photo.is_cover}
            onClick={onSetCover}
            className="min-h-10 rounded-full border border-sky-200 text-sm font-black text-sky-700 transition enabled:hover:bg-sky-50 disabled:opacity-40"
          >
            На обкладинку
          </button>

          <button
            type="button"
            disabled={isBusy}
            onClick={onDelete}
            className="min-h-10 rounded-full border border-red-200 text-sm font-black text-red-600 transition enabled:hover:bg-red-50 disabled:opacity-40"
          >
            Видалити
          </button>
        </div>
      </div>
    </article>
  );
}
