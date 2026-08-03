"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";

import { supabase } from "@/lib/supabase";

type NewsStatus = "draft" | "published";

type NewsFormState = {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverUrl: string;
  status: NewsStatus;
  isFeatured: boolean;
};

const INITIAL_NEWS: NewsFormState = {
  title: "«Олімп Футзал» запускає власну цифрову систему управління клубом",
  slug: "olimp-futsal-zapuskaie-vlasnu-tsyfrovu-systemu",
  excerpt:
    "Ми продовжуємо розвиток клубу не лише на майданчику, а й за його межами. Розпочато запуск власної цифрової системи, яка об’єднає тренування, матчі, статистику, відвідуваність, новини та роботу з командою в одному місці.",
  content: `«Олімп Футзал» робить ще один важливий крок у своєму розвитку.

Ми працюємо над власною цифровою системою управління клубом, яка допоможе зробити роботу тренерського штабу, адміністрації та гравців ще зручнішою та ефективнішою.

Уже зараз система підтримує:

⚽ управління матчами та результатами;
🏆 автоматичний розрахунок турнірних таблиць;
📊 індивідуальну статистику гравців;
📅 планування тренувань;
✅ облік відвідуваності;
📲 PWA-додаток та push-сповіщення для підтвердження участі у тренуваннях.

Попереду ще багато цікавих можливостей: новини клубу, фотогалереї, публічна статистика, тактичні інструменти для тренерів та багато іншого.

Ми створюємо систему насамперед для себе — щоб вона відповідала реальним потребам футзального клубу. Але в майбутньому вона може стати корисною і для інших команд.

Це лише початок великого проєкту.

Разом будуємо майбутнє «Олімп Футзал». 💙`,
  coverUrl: "",
  status: "published",
  isFeatured: true,
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

function getStoragePathFromPublicUrl(url: string) {
  const marker = "/storage/v1/object/public/news-images/";
  const markerIndex = url.indexOf(marker);

  if (markerIndex === -1) {
    return null;
  }

  return decodeURIComponent(url.slice(markerIndex + marker.length));
}

export default function CreateNewsPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [form, setForm] = useState<NewsFormState>(INITIAL_NEWS);
  const [slugWasEdited, setSlugWasEdited] = useState(false);

  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "">("");

  const previewContent = useMemo(
    () =>
      form.content
        .split("\n")
        .map((paragraph) => paragraph.trim())
        .filter(Boolean),
    [form.content],
  );

  function updateForm<Key extends keyof NewsFormState>(
    key: Key,
    value: NewsFormState[Key],
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

  async function uploadCover(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setMessage("Оберіть файл зображення.");
      setMessageType("error");
      event.target.value = "";
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setMessage("Розмір обкладинки не повинен перевищувати 8 MB.");
      setMessageType("error");
      event.target.value = "";
      return;
    }

    setIsUploading(true);
    setMessage("");
    setMessageType("");

    try {
      const extension =
        file.name.split(".").pop()?.toLocaleLowerCase() || "jpg";

      const filePath = `covers/${Date.now()}-${crypto.randomUUID()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("news-images")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type,
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage
        .from("news-images")
        .getPublicUrl(filePath);

      if (!data.publicUrl) {
        throw new Error("Не вдалося отримати URL обкладинки.");
      }

      if (form.coverUrl) {
        const previousPath = getStoragePathFromPublicUrl(form.coverUrl);

        if (previousPath) {
          const { error: removeError } = await supabase.storage
            .from("news-images")
            .remove([previousPath]);

          if (removeError) {
            console.warn("Previous news cover removal warning:", removeError);
          }
        }
      }

      updateForm("coverUrl", data.publicUrl);
      setMessage("Обкладинку завантажено.");
      setMessageType("success");
    } catch (error) {
      console.error("News cover upload error:", error);

      setMessage(
        error instanceof Error
          ? error.message
          : "Не вдалося завантажити обкладинку.",
      );
      setMessageType("error");
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  }

  async function removeCover() {
    if (!form.coverUrl) {
      return;
    }

    setIsUploading(true);
    setMessage("");
    setMessageType("");

    try {
      const filePath = getStoragePathFromPublicUrl(form.coverUrl);

      if (filePath) {
        const { error } = await supabase.storage
          .from("news-images")
          .remove([filePath]);

        if (error) {
          throw error;
        }
      }

      updateForm("coverUrl", "");
      setMessage("Обкладинку видалено.");
      setMessageType("success");
    } catch (error) {
      console.error("News cover removal error:", error);

      setMessage(
        error instanceof Error
          ? error.message
          : "Не вдалося видалити обкладинку.",
      );
      setMessageType("error");
    } finally {
      setIsUploading(false);
    }
  }

  async function saveNews(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const title = form.title.trim();
    const slug = createSlug(form.slug);
    const excerpt = form.excerpt.trim();
    const content = form.content.trim();

    if (!title) {
      setMessage("Вкажіть заголовок новини.");
      setMessageType("error");
      return;
    }

    if (!slug) {
      setMessage("Вкажіть коректний slug.");
      setMessageType("error");
      return;
    }

    if (!content) {
      setMessage("Додайте повний текст новини.");
      setMessageType("error");
      return;
    }

    setIsSaving(true);
    setMessage("");
    setMessageType("");

    try {
      const { data: existingNews, error: slugCheckError } = await supabase
        .from("news")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();

      if (slugCheckError) {
        throw slugCheckError;
      }

      if (existingNews) {
        throw new Error("Новина з таким slug уже існує. Змініть адресу.");
      }

      const publishedAt =
        form.status === "published" ? new Date().toISOString() : null;

      const { data, error } = await supabase
        .from("news")
        .insert({
          title,
          slug,
          excerpt: excerpt || null,
          content,
          cover_url: form.coverUrl || null,
          status: form.status,
          is_featured: form.isFeatured,
          published_at: publishedAt,
        })
        .select("id")
        .single();

      if (error) {
        throw error;
      }

      setMessage(
        form.status === "published"
          ? "Першу новину створено та опубліковано."
          : "Новину збережено як чернетку.",
      );
      setMessageType("success");

      window.setTimeout(() => {
        router.push(`/admin/news/${data.id}`);
      }, 700);
    } catch (error) {
      console.error("News creation error:", error);

      setMessage(
        error instanceof Error ? error.message : "Не вдалося створити новину.",
      );
      setMessageType("error");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="pb-12">
      <section className="rounded-[2rem] bg-slate-950 px-6 py-8 text-white shadow-xl sm:px-9 sm:py-10">
        <Link
          href="/admin/news"
          className="text-sm font-bold text-sky-400 transition hover:text-sky-300"
        >
          ← Усі новини
        </Link>

        <p className="mt-6 text-xs font-black uppercase tracking-[0.26em] text-sky-400">
          Новий матеріал
        </p>

        <h1 className="mt-3 text-3xl font-black sm:text-4xl">
          Створити новину
        </h1>

        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300 sm:text-base">
          Перша новина вже підготовлена. Перевірте текст, додайте обкладинку та
          опублікуйте її на сайті «Олімп Футзал».
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
        onSubmit={(event) => void saveNews(event)}
        className="mt-8 grid gap-8 2xl:grid-cols-[minmax(0,1fr)_440px]"
      >
        <div className="space-y-6">
          <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-600">
              Основна інформація
            </p>

            <div className="mt-6 space-y-5">
              <label className="block">
                <span className="text-sm font-black text-slate-700">
                  Заголовок *
                </span>

                <input
                  type="text"
                  value={form.title}
                  onChange={(event) => handleTitleChange(event.target.value)}
                  placeholder="Заголовок новини"
                  className="mt-2 min-h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-lg font-bold outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
                />
              </label>

              <label className="block">
                <span className="text-sm font-black text-slate-700">
                  Slug *
                </span>

                <div className="mt-2 flex min-h-14 items-center rounded-2xl border border-slate-200 bg-slate-50 focus-within:border-sky-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-sky-100">
                  <span className="pl-4 text-sm font-bold text-slate-400">
                    /news/
                  </span>

                  <input
                    type="text"
                    value={form.slug}
                    onChange={(event) => {
                      setSlugWasEdited(true);
                      updateForm("slug", createSlug(event.target.value));
                    }}
                    placeholder="adresa-novyny"
                    className="min-h-14 min-w-0 flex-1 bg-transparent px-1 pr-4 font-semibold text-slate-800 outline-none"
                  />
                </div>

                <p className="mt-2 text-xs leading-5 text-slate-500">
                  Використовується в адресі публічної сторінки.
                </p>
              </label>

              <label className="block">
                <span className="text-sm font-black text-slate-700">
                  Короткий анонс
                </span>

                <textarea
                  value={form.excerpt}
                  onChange={(event) =>
                    updateForm("excerpt", event.target.value)
                  }
                  rows={4}
                  placeholder="Короткий текст для картки новини"
                  className="mt-2 w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 leading-6 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
                />

                <div className="mt-2 flex justify-end">
                  <span className="text-xs font-bold text-slate-400">
                    {form.excerpt.length} символів
                  </span>
                </div>
              </label>

              <label className="block">
                <span className="text-sm font-black text-slate-700">
                  Повний текст *
                </span>

                <textarea
                  value={form.content}
                  onChange={(event) =>
                    updateForm("content", event.target.value)
                  }
                  rows={18}
                  placeholder="Текст новини"
                  className="mt-2 w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 leading-7 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
                />

                <p className="mt-2 text-xs leading-5 text-slate-500">
                  Порожній рядок створює новий абзац на публічній сторінці.
                </p>
              </label>
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-600">
              Обкладинка
            </p>

            <div className="mt-6">
              {form.coverUrl ? (
                <div className="overflow-hidden rounded-3xl border border-slate-200 bg-[#06142B]">
                  <div className="flex w-full items-center justify-center">
                    <img
                      src={form.coverUrl}
                      alt={form.title || "Обкладинка новини"}
                      className="h-auto max-h-none w-full object-contain object-center"
                    />
                  </div>

                  <div className="flex flex-wrap gap-3 bg-white p-4">
                    <button
                      type="button"
                      disabled={isUploading}
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex min-h-11 items-center justify-center rounded-full bg-slate-950 px-5 text-sm font-black text-white transition enabled:hover:bg-sky-500 enabled:hover:text-slate-950 disabled:opacity-50"
                    >
                      Замінити
                    </button>

                    <button
                      type="button"
                      disabled={isUploading}
                      onClick={() => void removeCover()}
                      className="inline-flex min-h-11 items-center justify-center rounded-full border border-red-200 px-5 text-sm font-black text-red-600 transition enabled:hover:bg-red-50 disabled:opacity-50"
                    >
                      Видалити
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="flex min-h-64 w-full flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center transition enabled:hover:border-sky-400 enabled:hover:bg-sky-50 disabled:opacity-50"
                >
                  <span className="text-5xl">🖼️</span>

                  <strong className="mt-4 text-lg text-slate-800">
                    {isUploading ? "Завантаження..." : "Додати обкладинку"}
                  </strong>

                  <span className="mt-2 text-sm text-slate-500">
                    JPG, PNG або WebP до 8 MB
                  </span>
                </button>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(event) => void uploadCover(event)}
                className="hidden"
              />
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
                    updateForm("status", event.target.value as NewsStatus)
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
                    Закріпити новину
                  </strong>

                  <span className="mt-1 block text-sm text-slate-500">
                    Показувати першою на головній
                  </span>
                </div>
              </label>
            </div>
          </section>

          <div className="sticky bottom-4 z-30 rounded-[2rem] border border-slate-200 bg-white/95 p-4 shadow-2xl backdrop-blur">
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="submit"
                disabled={isSaving || isUploading}
                className="inline-flex min-h-14 flex-1 items-center justify-center rounded-full bg-slate-950 px-7 font-black text-white transition enabled:hover:bg-sky-500 enabled:hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving
                  ? "Збереження..."
                  : form.status === "published"
                    ? "Опублікувати новину"
                    : "Зберегти чернетку"}
              </button>

              <Link
                href="/admin/news"
                className="inline-flex min-h-14 items-center justify-center rounded-full border border-slate-300 px-7 font-black text-slate-700 transition hover:bg-slate-100"
              >
                Скасувати
              </Link>
            </div>
          </div>
        </div>

        <aside className="2xl:sticky 2xl:top-6 2xl:self-start">
          <div className="overflow-hidden rounded-[2rem] bg-slate-950 text-white shadow-xl">
            <div className="relative aspect-[16/9] overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-sky-950">
              {form.coverUrl ? (
                <img
                  src={form.coverUrl}
                  alt={form.title || "Обкладинка новини"}
                  className="h-full w-full object-contain object-center p-2"
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <div className="text-center">
                    <span className="text-5xl">📰</span>

                    <p className="mt-4 text-xs font-black uppercase tracking-[0.24em] text-sky-400">
                      Олімп Футзал
                    </p>
                  </div>
                </div>
              )}

              <div className="absolute left-4 top-4 flex flex-wrap gap-2">
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

            <div className="p-6">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-sky-400">
                Попередній перегляд
              </p>

              <h2 className="mt-4 text-2xl font-black leading-tight">
                {form.title || "Заголовок новини"}
              </h2>

              <p className="mt-4 text-sm leading-6 text-slate-300">
                {form.excerpt ||
                  "Короткий анонс відображатиметься у картці новини."}
              </p>

              <div className="mt-6 border-t border-white/10 pt-6">
                <div className="space-y-4 text-sm leading-7 text-slate-300">
                  {previewContent.slice(0, 5).map((paragraph, index) => (
                    <p key={`${paragraph}-${index}`}>{paragraph}</p>
                  ))}

                  {previewContent.length > 5 && (
                    <p className="font-bold text-sky-400">
                      Продовження на сторінці новини…
                    </p>
                  )}
                </div>
              </div>

              <p className="mt-6 break-all text-xs font-bold text-slate-500">
                /news/{form.slug || "adresa-novyny"}
              </p>
            </div>
          </div>
        </aside>
      </form>
    </div>
  );
}
