"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

type PlayerRow = {
  id: string;
  full_name: string;
  display_name: string;
  shirt_number: number | null;
  position: string | null;
  is_active: boolean;
  photo_url: string | null;
  created_at: string;
  updated_at: string;
};

type PlayerFormState = {
  id: string | null;
  fullName: string;
  displayName: string;
  shirtNumber: string;
  position: string;
  isActive: boolean;
  photoUrl: string;
  photoFile: File | null;
  removePhoto: boolean;
};

type StatusFilter = "all" | "active" | "inactive";

const PLAYER_PHOTOS_BUCKET = "player-photos";
const MAX_PHOTO_SIZE = 5 * 1024 * 1024;

const allowedPhotoTypes = ["image/jpeg", "image/png", "image/webp"];

const emptyPlayerForm: PlayerFormState = {
  id: null,
  fullName: "",
  displayName: "",
  shirtNumber: "",
  position: "Універсал",
  isActive: true,
  photoUrl: "",
  photoFile: null,
  removePhoto: false,
};

const positionOptions = [
  "Воротар",
  "Універсал",
  "Тренер / Універсал",
  "Тренер",
];

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (!parts.length) {
    return "OF";
  }

  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function getPhotoExtension(file: File) {
  const extensionFromName = file.name.split(".").pop()?.toLowerCase();

  if (
    extensionFromName === "jpg" ||
    extensionFromName === "jpeg" ||
    extensionFromName === "png" ||
    extensionFromName === "webp"
  ) {
    return extensionFromName === "jpeg" ? "jpg" : extensionFromName;
  }

  if (file.type === "image/png") {
    return "png";
  }

  if (file.type === "image/webp") {
    return "webp";
  }

  return "jpg";
}

function getStoragePathFromPublicUrl(photoUrl: string) {
  const pathMarker = `/storage/v1/object/public/${PLAYER_PHOTOS_BUCKET}/`;
  const markerIndex = photoUrl.indexOf(pathMarker);

  if (markerIndex === -1) {
    return null;
  }

  const encodedPath = photoUrl.slice(markerIndex + pathMarker.length);

  try {
    return decodeURIComponent(encodedPath);
  } catch {
    return encodedPath;
  }
}

export default function AdminPlayersPage() {
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [form, setForm] = useState<PlayerFormState>(emptyPlayerForm);

  const [photoPreviewUrl, setPhotoPreviewUrl] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const [isLoading, setIsLoading] = useState(true);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [processingPlayerId, setProcessingPlayerId] = useState<string | null>(
    null,
  );

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "">("");

  async function loadPlayers(showLoader = false) {
    if (showLoader) {
      setIsLoading(true);
    }

    const { data, error } = await supabase
      .from("players")
      .select(
        "id, full_name, display_name, shirt_number, position, is_active, photo_url, created_at, updated_at",
      )
      .order("is_active", {
        ascending: false,
      })
      .order("shirt_number", {
        ascending: true,
        nullsFirst: false,
      })
      .order("full_name", {
        ascending: true,
      });

    if (error) {
      console.error("Players loading error:", error);

      setMessage("Не вдалося завантажити список гравців.");
      setMessageType("error");
      setIsLoading(false);
      return;
    }

    setPlayers((data ?? []) as PlayerRow[]);
    setIsLoading(false);
  }

  useEffect(() => {
    void loadPlayers(true);

    const realtimeChannel = supabase
      .channel("olimp-admin-players-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "players",
        },
        () => {
          void loadPlayers();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(realtimeChannel);
    };
  }, []);

  const activePlayersCount = useMemo(
    () => players.filter((player) => player.is_active).length,
    [players],
  );

  const inactivePlayersCount = players.length - activePlayersCount;

  const filteredPlayers = useMemo(() => {
    const normalizedSearchQuery = searchQuery.trim().toLocaleLowerCase("uk-UA");

    return players.filter((player) => {
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && player.is_active) ||
        (statusFilter === "inactive" && !player.is_active);

      if (!matchesStatus) {
        return false;
      }

      if (!normalizedSearchQuery) {
        return true;
      }

      const searchableText = [
        player.full_name,
        player.display_name,
        player.position ?? "",
        player.shirt_number?.toString() ?? "",
      ]
        .join(" ")
        .toLocaleLowerCase("uk-UA");

      return searchableText.includes(normalizedSearchQuery);
    });
  }, [players, searchQuery, statusFilter]);

  function resetPhotoInput() {
    if (photoInputRef.current) {
      photoInputRef.current.value = "";
    }
  }

  function openCreateForm() {
    setForm(emptyPlayerForm);
    setPhotoPreviewUrl("");
    resetPhotoInput();

    setIsEditorOpen(true);
    setMessage("");
    setMessageType("");
  }

  function openEditForm(player: PlayerRow) {
    setForm({
      id: player.id,
      fullName: player.full_name,
      displayName: player.display_name,
      shirtNumber:
        player.shirt_number !== null ? player.shirt_number.toString() : "",
      position: player.position ?? "",
      isActive: player.is_active,
      photoUrl: player.photo_url ?? "",
      photoFile: null,
      removePhoto: false,
    });

    setPhotoPreviewUrl(player.photo_url ?? "");
    resetPhotoInput();

    setIsEditorOpen(true);
    setMessage("");
    setMessageType("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function closeEditor() {
    if (isSaving) {
      return;
    }

    setForm(emptyPlayerForm);
    setPhotoPreviewUrl("");
    resetPhotoInput();
    setIsEditorOpen(false);
  }

  function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) {
      return;
    }

    if (!allowedPhotoTypes.includes(selectedFile.type)) {
      setMessage("Оберіть фотографію у форматі JPG, PNG або WebP.");
      setMessageType("error");
      resetPhotoInput();
      return;
    }

    if (selectedFile.size > MAX_PHOTO_SIZE) {
      setMessage("Розмір фотографії не повинен перевищувати 5 MB.");
      setMessageType("error");
      resetPhotoInput();
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      setPhotoPreviewUrl(
        typeof reader.result === "string" ? reader.result : "",
      );
    };

    reader.onerror = () => {
      setMessage("Не вдалося прочитати вибрану фотографію.");
      setMessageType("error");
      resetPhotoInput();
    };

    reader.readAsDataURL(selectedFile);

    setForm((currentForm) => ({
      ...currentForm,
      photoFile: selectedFile,
      removePhoto: false,
    }));

    setMessage("");
    setMessageType("");
  }

  function removeSelectedPhoto() {
    setForm((currentForm) => ({
      ...currentForm,
      photoUrl: "",
      photoFile: null,
      removePhoto: true,
    }));

    setPhotoPreviewUrl("");
    resetPhotoInput();
  }

  async function uploadPlayerPhoto(playerId: string, photoFile: File) {
    const extension = getPhotoExtension(photoFile);
    const photoPath = `${playerId}/${Date.now()}-profile.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from(PLAYER_PHOTOS_BUCKET)
      .upload(photoPath, photoFile, {
        cacheControl: "3600",
        contentType: photoFile.type,
        upsert: false,
      });

    if (uploadError) {
      throw uploadError;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(PLAYER_PHOTOS_BUCKET).getPublicUrl(photoPath);

    return {
      publicUrl,
      photoPath,
    };
  }

  async function deleteStoredPhoto(photoUrl: string) {
    const storagePath = getStoragePathFromPublicUrl(photoUrl);

    if (!storagePath) {
      return;
    }

    const { error } = await supabase.storage
      .from(PLAYER_PHOTOS_BUCKET)
      .remove([storagePath]);

    if (error) {
      console.error("Old player photo removing error:", error);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedFullName = form.fullName.trim();
    const normalizedDisplayName = form.displayName.trim();
    const normalizedPosition = form.position.trim();

    if (!normalizedFullName || !normalizedDisplayName) {
      setMessage("Заповніть повне та коротке ім’я гравця.");
      setMessageType("error");
      return;
    }

    let shirtNumber: number | null = null;

    if (form.shirtNumber.trim()) {
      shirtNumber = Number(form.shirtNumber);

      if (
        !Number.isInteger(shirtNumber) ||
        shirtNumber < 0 ||
        shirtNumber > 999
      ) {
        setMessage("Номер гравця має бути цілим числом від 0 до 999.");
        setMessageType("error");
        return;
      }
    }

    const duplicateNumber = players.find(
      (player) =>
        player.id !== form.id &&
        shirtNumber !== null &&
        player.shirt_number === shirtNumber &&
        player.is_active,
    );

    if (duplicateNumber) {
      const isConfirmed = window.confirm(
        `Номер №${shirtNumber} вже використовується гравцем «${duplicateNumber.display_name}».\n\nВсе одно зберегти?`,
      );

      if (!isConfirmed) {
        return;
      }
    }

    setIsSaving(true);
    setMessage("");
    setMessageType("");

    let newlyCreatedPlayerId: string | null = null;
    let newlyUploadedPhotoPath: string | null = null;

    try {
      const existingPlayer = form.id
        ? (players.find((player) => player.id === form.id) ?? null)
        : null;

      const oldPhotoUrl = existingPlayer?.photo_url ?? null;

      const basicPlayerPayload = {
        full_name: normalizedFullName,
        display_name: normalizedDisplayName,
        shirt_number: shirtNumber,
        position: normalizedPosition || null,
        is_active: form.isActive,
        updated_at: new Date().toISOString(),
      };

      let savedPlayerId = form.id;

      if (form.id) {
        const { error } = await supabase
          .from("players")
          .update(basicPlayerPayload)
          .eq("id", form.id);

        if (error) {
          throw error;
        }
      } else {
        const { data, error } = await supabase
          .from("players")
          .insert({
            ...basicPlayerPayload,
            photo_url: null,
          })
          .select("id")
          .single();

        if (error) {
          throw error;
        }

        savedPlayerId = data.id;
        newlyCreatedPlayerId = data.id;
      }

      if (!savedPlayerId) {
        throw new Error("Player ID was not returned after saving.");
      }

      let finalPhotoUrl: string | null = oldPhotoUrl;

      if (form.removePhoto) {
        finalPhotoUrl = null;
      }

      if (form.photoFile) {
        const uploadedPhoto = await uploadPlayerPhoto(
          savedPlayerId,
          form.photoFile,
        );

        finalPhotoUrl = uploadedPhoto.publicUrl;
        newlyUploadedPhotoPath = uploadedPhoto.photoPath;
      }

      const shouldUpdatePhoto =
        Boolean(form.photoFile) ||
        form.removePhoto ||
        (!form.id && finalPhotoUrl !== null);

      if (shouldUpdatePhoto) {
        const { data: updatedPlayer, error: photoUpdateError } = await supabase
          .from("players")
          .update({
            photo_url: finalPhotoUrl,
            updated_at: new Date().toISOString(),
          })
          .eq("id", savedPlayerId)
          .select("id, photo_url")
          .single();

        if (photoUpdateError) {
          throw photoUpdateError;
        }

        if (!updatedPlayer) {
          throw new Error(
            "Player photo URL was not saved. The update affected no rows.",
          );
        }

        if (updatedPlayer.photo_url !== finalPhotoUrl) {
          throw new Error(
            "Saved player photo URL does not match uploaded photo.",
          );
        }
      }

      const photoWasReplaced =
        Boolean(form.photoFile) &&
        Boolean(oldPhotoUrl) &&
        finalPhotoUrl !== oldPhotoUrl;

      if ((photoWasReplaced || form.removePhoto) && oldPhotoUrl) {
        await deleteStoredPhoto(oldPhotoUrl);
      }

      setMessage(
        form.id
          ? "Дані гравця успішно оновлено."
          : "Нового гравця успішно додано.",
      );

      setMessageType("success");

      setForm(emptyPlayerForm);
      setPhotoPreviewUrl("");
      resetPhotoInput();
      setIsEditorOpen(false);

      await loadPlayers();
    } catch (error) {
      console.error("Player saving error:", error);

      if (newlyUploadedPhotoPath) {
        await supabase.storage
          .from(PLAYER_PHOTOS_BUCKET)
          .remove([newlyUploadedPhotoPath]);
      }

      if (newlyCreatedPlayerId) {
        await supabase.from("players").delete().eq("id", newlyCreatedPlayerId);
      }

      setMessage(
        "Не вдалося зберегти гравця або завантажити фотографію. Перевірте дані та права Storage.",
      );

      setMessageType("error");
    } finally {
      setIsSaving(false);
    }
  }

  async function togglePlayerStatus(player: PlayerRow) {
    const nextStatus = !player.is_active;

    const confirmationText = nextStatus
      ? `Повернути гравця «${player.display_name}» до активного складу?`
      : `Деактивувати гравця «${player.display_name}»?\n\nВін залишиться у базі та в історичній статистиці, але зникне зі списку активних гравців.`;

    const isConfirmed = window.confirm(confirmationText);

    if (!isConfirmed) {
      return;
    }

    setProcessingPlayerId(player.id);
    setMessage("");
    setMessageType("");

    const { error } = await supabase
      .from("players")
      .update({
        is_active: nextStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", player.id);

    if (error) {
      console.error("Player status updating error:", error);

      setMessage("Не вдалося змінити статус гравця.");
      setMessageType("error");
      setProcessingPlayerId(null);
      return;
    }

    setMessage(
      nextStatus
        ? "Гравця повернуто до активного складу."
        : "Гравця деактивовано.",
    );

    setMessageType("success");

    await loadPlayers();
    setProcessingPlayerId(null);
  }

  async function deletePlayer(player: PlayerRow) {
    const isConfirmed = window.confirm(
      `Остаточно видалити гравця «${player.full_name}»?\n\nДля збереження статистики безпечніше використати деактивацію.`,
    );

    if (!isConfirmed) {
      return;
    }

    const secondConfirmation = window.confirm(
      "Ви точно хочете повністю видалити цього гравця?",
    );

    if (!secondConfirmation) {
      return;
    }

    setProcessingPlayerId(player.id);
    setMessage("");
    setMessageType("");

    const { error } = await supabase
      .from("players")
      .delete()
      .eq("id", player.id);

    if (error) {
      console.error("Player deletion error:", error);

      setMessage(
        "Не вдалося видалити гравця. Ймовірно, з ним пов’язані відповіді або Push-підписки. Використайте деактивацію.",
      );

      setMessageType("error");
      setProcessingPlayerId(null);
      return;
    }

    if (player.photo_url) {
      await deleteStoredPhoto(player.photo_url);
    }

    if (form.id === player.id) {
      setForm(emptyPlayerForm);
      setPhotoPreviewUrl("");
      resetPhotoInput();
      setIsEditorOpen(false);
    }

    setMessage("Гравця повністю видалено.");
    setMessageType("success");

    await loadPlayers();
    setProcessingPlayerId(null);
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <span className="mx-auto block h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-sky-500" />

          <p className="mt-5 text-sm font-black uppercase tracking-[0.22em] text-sky-700">
            Завантаження гравців...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <header className="rounded-[2rem] bg-slate-950 p-6 text-white shadow-xl sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-sky-400">
              Склад команди
            </p>

            <h1 className="mt-3 text-3xl font-black sm:text-4xl">Гравці</h1>

            <p className="mt-3 max-w-2xl leading-7 text-slate-300">
              Керуйте складом команди, ігровими номерами, позиціями,
              фотографіями та активністю гравців.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateForm}
            className="inline-flex min-h-12 items-center justify-center rounded-full bg-sky-400 px-6 py-3 font-black text-slate-950 transition hover:-translate-y-0.5 hover:bg-sky-300"
          >
            + Додати гравця
          </button>
        </div>
      </header>

      {message && (
        <div
          role={messageType === "error" ? "alert" : "status"}
          className={`mt-6 rounded-2xl border px-5 py-4 text-sm font-bold ${
            messageType === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-red-200 bg-red-50 text-red-900"
          }`}
        >
          {message}
        </div>
      )}

      {isEditorOpen && (
        <section className="mt-8 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-950/5 sm:p-8">
          <div className="flex items-start justify-between gap-5">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-sky-600">
                {form.id ? "Редагування профілю" : "Новий гравець"}
              </p>

              <h2 className="mt-3 text-2xl font-black sm:text-3xl">
                {form.id ? "Редагувати гравця" : "Додати гравця"}
              </h2>
            </div>

            <button
              type="button"
              onClick={closeEditor}
              aria-label="Закрити форму"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-2xl font-bold transition hover:bg-slate-200"
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-8">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="md:col-span-2">
                <p className="text-sm font-black uppercase tracking-[0.16em] text-slate-600">
                  Фото гравця
                </p>

                <div className="mt-3 flex flex-col gap-5 rounded-3xl border border-slate-200 bg-slate-50 p-5 sm:flex-row sm:items-center">
                  <div className="relative h-36 w-32 shrink-0 overflow-hidden rounded-3xl bg-slate-950">
                    {" "}
                    {photoPreviewUrl ? (
                      <img
                        src={photoPreviewUrl}
                        alt="Попередній перегляд фотографії гравця"
                        className="h-full w-full object-cover object-top"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-2xl font-black text-white">
                        {getInitials(form.displayName || form.fullName)}
                      </div>
                    )}
                  </div>

                  <div className="flex-1">
                    <input
                      ref={photoInputRef}
                      id="player-photo"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handlePhotoChange}
                      className="block w-full cursor-pointer rounded-2xl border border-slate-200 bg-white text-sm text-slate-600 file:mr-4 file:cursor-pointer file:border-0 file:bg-sky-100 file:px-5 file:py-4 file:font-black file:text-sky-800 hover:file:bg-sky-200"
                    />

                    <p className="mt-3 text-sm leading-6 text-slate-500">
                      JPG, PNG або WebP. Максимальний розмір — 5 MB.
                    </p>

                    {photoPreviewUrl && (
                      <button
                        type="button"
                        onClick={removeSelectedPhoto}
                        className="mt-3 text-sm font-black text-red-700 underline decoration-red-200 underline-offset-4"
                      >
                        Видалити фотографію
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="md:col-span-2">
                <label
                  htmlFor="player-full-name"
                  className="text-sm font-black uppercase tracking-[0.16em] text-slate-600"
                >
                  Повне ім’я
                </label>

                <input
                  id="player-full-name"
                  type="text"
                  value={form.fullName}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      fullName: event.target.value,
                    })
                  }
                  maxLength={150}
                  placeholder="Наприклад: Расторгуєв Денис Віталійович"
                  className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
                />
              </div>

              <div>
                <label
                  htmlFor="player-display-name"
                  className="text-sm font-black uppercase tracking-[0.16em] text-slate-600"
                >
                  Коротке ім’я
                </label>

                <input
                  id="player-display-name"
                  type="text"
                  value={form.displayName}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      displayName: event.target.value,
                    })
                  }
                  maxLength={60}
                  placeholder="Наприклад: Денис"
                  className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
                />
              </div>

              <div>
                <label
                  htmlFor="player-shirt-number"
                  className="text-sm font-black uppercase tracking-[0.16em] text-slate-600"
                >
                  Ігровий номер
                </label>

                <input
                  id="player-shirt-number"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={999}
                  value={form.shirtNumber}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      shirtNumber: event.target.value,
                    })
                  }
                  placeholder="Без номера"
                  className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
                />
              </div>

              <div>
                <label
                  htmlFor="player-position"
                  className="text-sm font-black uppercase tracking-[0.16em] text-slate-600"
                >
                  Позиція
                </label>

                <input
                  id="player-position"
                  type="text"
                  list="player-position-options"
                  value={form.position}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      position: event.target.value,
                    })
                  }
                  maxLength={80}
                  className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
                />

                <datalist id="player-position-options">
                  {positionOptions.map((position) => (
                    <option key={position} value={position} />
                  ))}
                </datalist>
              </div>

              <label className="flex cursor-pointer items-center justify-between gap-5 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
                <span>
                  <span className="block font-black">Активний гравець</span>

                  <span className="mt-1 block text-sm leading-6 text-slate-500">
                    Активні гравці доступні у формі підтвердження участі.
                  </span>
                </span>

                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      isActive: event.target.checked,
                    })
                  }
                  className="h-6 w-6 shrink-0 accent-sky-500"
                />
              </label>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex min-h-14 flex-1 items-center justify-center rounded-full bg-slate-950 px-7 py-4 font-black text-white transition enabled:hover:-translate-y-0.5 enabled:hover:bg-sky-500 enabled:hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving
                  ? form.photoFile
                    ? "Завантаження фото..."
                    : "Збереження..."
                  : form.id
                    ? "Зберегти зміни"
                    : "Додати гравця"}
              </button>

              <button
                type="button"
                onClick={closeEditor}
                disabled={isSaving}
                className="inline-flex min-h-14 items-center justify-center rounded-full border border-slate-300 px-7 py-4 font-black text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
              >
                Скасувати
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="mt-8 grid gap-4 sm:grid-cols-3">
        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-bold text-slate-500">Усього гравців</p>

          <strong className="mt-3 block text-4xl font-black text-sky-600">
            {players.length}
          </strong>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-bold text-slate-500">Активний склад</p>

          <strong className="mt-3 block text-4xl font-black text-emerald-600">
            {activePlayersCount}
          </strong>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-bold text-slate-500">Неактивні</p>

          <strong className="mt-3 block text-4xl font-black text-slate-500">
            {inactivePlayersCount}
          </strong>
        </article>
      </section>

      <section className="mt-8">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.22em] text-sky-600">
              Команда
            </p>

            <h2 className="mt-2 text-3xl font-black">Список гравців</h2>
          </div>

          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] xl:w-[42rem]">
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Пошук за ім’ям, номером або позицією"
              className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-5 py-3 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
            />

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as StatusFilter)
              }
              className="min-h-12 rounded-2xl border border-slate-200 bg-white px-5 py-3 font-bold outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
            >
              <option value="all">Усі гравці</option>
              <option value="active">Активні</option>
              <option value="inactive">Неактивні</option>
            </select>
          </div>
        </div>

        {filteredPlayers.length > 0 ? (
          <div className="mt-6 grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
            {filteredPlayers.map((player) => {
              const isProcessing = processingPlayerId === player.id;

              return (
                <article
                  key={player.id}
                  className={`rounded-3xl border p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg ${
                    player.is_active
                      ? "border-slate-200 bg-white"
                      : "border-slate-200 bg-slate-50 opacity-80"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="relative h-20 w-20 shrink-0">
                      {player.photo_url ? (
                        <img
                          src={player.photo_url}
                          alt={`Фото гравця ${player.display_name}`}
                          className="h-20 w-20 rounded-2xl object-cover object-top"
                        />
                      ) : (
                        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-950 text-xl font-black text-white">
                          {getInitials(player.display_name)}
                        </div>
                      )}

                      {player.shirt_number !== null && (
                        <span className="absolute -bottom-2 -right-2 flex min-h-7 min-w-7 items-center justify-center rounded-full border-2 border-white bg-sky-400 px-1.5 text-xs font-black text-slate-950">
                          {player.shirt_number}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ${
                            player.is_active
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          {player.is_active ? "Активний" : "Неактивний"}
                        </span>

                        {player.position && (
                          <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-700">
                            {player.position}
                          </span>
                        )}
                      </div>

                      <h3 className="mt-4 truncate text-xl font-black">
                        {player.display_name}
                      </h3>

                      <p className="mt-1 min-h-12 text-sm leading-6 text-slate-500">
                        {player.full_name}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => openEditForm(player)}
                      disabled={isProcessing}
                      className="inline-flex min-h-10 items-center justify-center rounded-full bg-slate-950 px-4 py-2 text-sm font-black text-white transition hover:bg-sky-500 hover:text-slate-950 disabled:opacity-50"
                    >
                      Редагувати
                    </button>

                    <button
                      type="button"
                      onClick={() => togglePlayerStatus(player)}
                      disabled={isProcessing}
                      className={`inline-flex min-h-10 items-center justify-center rounded-full border px-4 py-2 text-sm font-black transition disabled:opacity-50 ${
                        player.is_active
                          ? "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
                          : "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                      }`}
                    >
                      {isProcessing
                        ? "Обробка..."
                        : player.is_active
                          ? "Деактивувати"
                          : "Активувати"}
                    </button>

                    <button
                      type="button"
                      onClick={() => deletePlayer(player)}
                      disabled={isProcessing}
                      className="inline-flex min-h-10 items-center justify-center rounded-full border border-red-200 px-4 py-2 text-sm font-black text-red-700 transition hover:bg-red-50 disabled:opacity-50"
                    >
                      Видалити
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <p className="text-lg font-black">Гравців не знайдено</p>

            <p className="mt-2 text-slate-500">
              Змініть пошуковий запит або обраний фільтр.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
