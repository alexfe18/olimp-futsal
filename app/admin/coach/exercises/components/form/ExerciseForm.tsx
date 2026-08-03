"use client";

import Image from "next/image";
import Link from "next/link";
import { useId, type FormEvent, type ReactNode } from "react";

import Chip from "../ui/Chip";
import ContentCard from "../ui/ContentCard";
import ExerciseFormHero from "./ExerciseFormHero";
import {
  ageOptions,
  categoryOptions,
  difficultyOptions,
  formatOptions,
  getOptionLabel,
  goalOptions,
  typeOptions,
} from "./config/exercise-options";
import { useExerciseForm } from "./hooks/useExerciseForm";
import { useUnsavedChangesProtection } from "./hooks/useUnsavedChangesProtection";
import ExerciseFormSidebar from "./sections/ExerciseFormSidebar";
import {
  ExerciseWorkspaceLayout,
  ExerciseWorkspaceShell,
} from "../workspace";
import type {
  ExerciseDifficulty,
  ExerciseFormProps,
} from "./types/exercise-form";

const exerciseFormId = "exercise-form";

const inputClass =
  "min-h-13 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100";

export default function ExerciseForm({
  mode = "create",
  initialData,
}: ExerciseFormProps) {
  const exerciseForm = useExerciseForm({ mode, initialData });
  const {
    form,
    selectedGoals,
    selectedAgeGroups,
    tags,
    tagInput,
    coverFile,
    diagramFile,
    videoFile,
    coverPreview,
    diagramPreview,
    currentStatus,
    hasExistingCover,
    hasExistingDiagram,
    hasExistingVideo,
    coverMarkedForRemoval,
    diagramMarkedForRemoval,
    videoMarkedForRemoval,
    isSaving,
    hasUnsavedChanges,
    message,
    previewCategory,
    previewDifficulty,
    selectedGoalLabels,
    updateForm,
    toggleGoal,
    toggleAgeGroup,
    setTagInput,
    addTag,
    removeTag,
    handleImageSelection,
    handleVideoSelection,
    removeMedia,
    restoreMedia,
    clearExternalVideo,
    saveExercise,
  } = exerciseForm;

  const previewPlayerFormat = getOptionLabel(
    formatOptions,
    form.playerFormat,
    "Не вказано",
  );

  const cancelHref =
    mode === "edit" && initialData?.id
      ? `/admin/coach/exercises/${initialData.id}`
      : "/admin/coach/exercises";

  const { navigateSafely, navigateAfterSave } =
    useUnsavedChangesProtection({
      hasUnsavedChanges,
      isSaving,
    });

  async function handleSave(status: typeof currentStatus) {
    const exerciseId = await saveExercise(status);
    if (!exerciseId) return;

    navigateAfterSave(`/admin/coach/exercises/${exerciseId}`);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void handleSave(mode === "edit" ? currentStatus : "active");
  }

  const hero = (
    <>
      <Link
        href="/admin/coach/exercises"
        className="mb-5 inline-flex font-black text-sky-700 transition hover:text-sky-500"
      >
        ← До бібліотеки вправ
      </Link>
      <ExerciseFormHero
        mode={mode}
        title={form.title}
        status={currentStatus}
        isSaving={isSaving}
        formId={exerciseFormId}
        onCancel={() => void navigateSafely(cancelHref)}
        onSaveDraft={() => void handleSave("draft")}
      />
    </>
  );

  return (
    <ExerciseWorkspaceShell hero={hero}>
      <form id={exerciseFormId} onSubmit={handleSubmit}>
        {message ? (
          <p
            role={message.type === "error" ? "alert" : "status"}
            className={`mt-6 rounded-2xl border px-5 py-4 font-bold ${
              message.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-rose-200 bg-rose-50 text-rose-700"
            }`}
          >
            {message.text}
          </p>
        ) : null}

        <ExerciseWorkspaceLayout
          content={
            <div className="space-y-10">
            <FormArea
              eyebrow="Основна інформація"
              title="Основні параметри"
              description="Назва, класифікація та базові налаштування вправи."
            >
              <ContentCard
                icon="🧩"
                eyebrow="Параметри"
                title="Профіль вправи"
                contentClassName="!whitespace-normal !font-normal !leading-normal"
              >
                <div className="grid gap-5 md:grid-cols-2">
                  <Field label="Назва вправи" className="md:col-span-2">
                    <input
                      type="text"
                      value={form.title}
                      onChange={(event) => updateForm("title", event.target.value)}
                      maxLength={150}
                      placeholder="Наприклад: 3v2 після перехоплення"
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Категорія">
                    <select
                      value={form.category}
                      onChange={(event) =>
                        updateForm("category", event.target.value)
                      }
                      className={inputClass}
                    >
                      {categoryOptions.map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Тип">
                    <select
                      value={form.exerciseType}
                      onChange={(event) =>
                        updateForm("exerciseType", event.target.value)
                      }
                      className={inputClass}
                    >
                      {typeOptions.map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Формат">
                    <select
                      value={form.playerFormat}
                      onChange={(event) =>
                        updateForm("playerFormat", event.target.value)
                      }
                      className={inputClass}
                    >
                      {formatOptions.map(([value, label]) => (
                        <option key={value || "none"} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Складність">
                    <select
                      value={form.difficulty}
                      onChange={(event) =>
                        updateForm(
                          "difficulty",
                          event.target.value as ExerciseDifficulty,
                        )
                      }
                      className={inputClass}
                    >
                      {difficultyOptions.map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Тривалість, хв">
                    <input
                      type="number"
                      min="1"
                      max="300"
                      value={form.durationMinutes}
                      onChange={(event) =>
                        updateForm("durationMinutes", event.target.value)
                      }
                      className={inputClass}
                    />
                  </Field>

                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Мін. гравців">
                      <input
                        type="number"
                        min="1"
                        value={form.minPlayers}
                        onChange={(event) =>
                          updateForm("minPlayers", event.target.value)
                        }
                        className={inputClass}
                      />
                    </Field>
                    <Field label="Макс. гравців">
                      <input
                        type="number"
                        min="1"
                        value={form.maxPlayers}
                        onChange={(event) =>
                          updateForm("maxPlayers", event.target.value)
                        }
                        className={inputClass}
                      />
                    </Field>
                  </div>
                </div>
              </ContentCard>

              <ContentCard
                icon="🎯"
                eyebrow="Напрямки роботи"
                title="Цілі та вікові групи"
                contentClassName="!whitespace-normal !font-normal !leading-normal"
              >
                <div className="flex flex-wrap gap-2">
                  {goalOptions.map(([value, label]) => (
                    <Chip
                      key={value}
                      isActive={selectedGoals.includes(value)}
                      onClick={() => toggleGoal(value)}
                    >
                      {selectedGoals.includes(value) ? "✓ " : ""}
                      {label}
                    </Chip>
                  ))}
                </div>

                <div className="mt-7 border-t border-slate-100 pt-6">
                  <p className="font-black text-slate-700">Вікові групи</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {ageOptions.map((ageGroup) => (
                      <Chip
                        key={ageGroup}
                        variant="secondary"
                        isActive={selectedAgeGroups.includes(ageGroup)}
                        onClick={() => toggleAgeGroup(ageGroup)}
                      >
                        {selectedAgeGroups.includes(ageGroup) ? "✓ " : ""}
                        {ageGroup}
                      </Chip>
                    ))}
                  </div>
                </div>
              </ContentCard>
            </FormArea>

            <FormArea
              eyebrow="Методика"
              title="Організація та робота тренера"
              description="Опишіть проведення вправи, інвентар і ключові підказки."
            >
              <ContentCard
                icon="📋"
                eyebrow="Проведення"
                title="Зміст вправи"
                contentClassName="!whitespace-normal !font-normal !leading-normal"
              >
                <div className="grid gap-5 md:grid-cols-2">
                  <Field label="Опис вправи" className="md:col-span-2">
                    <textarea
                      rows={5}
                      value={form.description}
                      onChange={(event) =>
                        updateForm("description", event.target.value)
                      }
                      placeholder="Послідовність виконання, правила та завдання..."
                      className={`${inputClass} resize-y`}
                    />
                  </Field>

                  <Field label="Організація">
                    <textarea
                      rows={5}
                      value={form.organization}
                      onChange={(event) =>
                        updateForm("organization", event.target.value)
                      }
                      placeholder="Розміри майданчика, розташування гравців..."
                      className={`${inputClass} resize-y`}
                    />
                  </Field>

                  <Field label="Інвентар">
                    <textarea
                      rows={5}
                      value={form.equipment}
                      onChange={(event) =>
                        updateForm("equipment", event.target.value)
                      }
                      placeholder="М’ячі, фішки, манішки, ворота..."
                      className={`${inputClass} resize-y`}
                    />
                  </Field>

                  <Field label="Підказки тренера">
                    <textarea
                      rows={5}
                      value={form.coachingPoints}
                      onChange={(event) =>
                        updateForm("coachingPoints", event.target.value)
                      }
                      placeholder="На що звертати увагу під час виконання..."
                      className={`${inputClass} resize-y`}
                    />
                  </Field>

                  <Field label="Типові помилки">
                    <textarea
                      rows={5}
                      value={form.commonMistakes}
                      onChange={(event) =>
                        updateForm("commonMistakes", event.target.value)
                      }
                      placeholder="Що найчастіше виконується неправильно..."
                      className={`${inputClass} resize-y`}
                    />
                  </Field>
                </div>
              </ContentCard>
            </FormArea>

            <FormArea
              eyebrow="Медіа"
              title="Теги, схема та відео"
              description="Додайте матеріали, які допоможуть швидше зрозуміти вправу."
            >
              <ContentCard
                icon="🎬"
                eyebrow="Матеріали"
                title="Теги та медіа"
                contentClassName="!whitespace-normal !font-normal !leading-normal"
              >
                <Field label="Теги">
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(event) => setTagInput(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === ",") {
                          event.preventDefault();
                          addTag();
                        }
                      }}
                      placeholder="Введіть тег і натисніть Enter"
                      className={inputClass}
                    />
                    <button
                      type="button"
                      onClick={addTag}
                      className="min-h-13 rounded-2xl bg-slate-950 px-5 font-black text-white transition hover:bg-slate-800"
                    >
                      Додати
                    </button>
                  </div>

                  {tags.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {tags.map((tag) => (
                        <Chip
                          key={tag}
                          variant="secondary"
                          onClick={() => removeTag(tag)}
                        >
                          #{tag} ×
                        </Chip>
                      ))}
                    </div>
                  ) : null}
                </Field>

                <div className="mt-7 grid gap-5 border-t border-slate-100 pt-6 md:grid-cols-2">
                  <UploadField
                    label="Обкладинка"
                    accept="image/jpeg,image/png,image/webp"
                    mediaType="image"
                    previewUrl={coverPreview}
                    selectedFileName={coverFile?.name}
                    existingFileName={getStorageFileName(initialData?.coverImagePath)}
                    hasExistingFile={hasExistingCover}
                    isMarkedForRemoval={coverMarkedForRemoval}
                    onChange={(file) => handleImageSelection(file, "cover")}
                    onRemove={() => removeMedia("cover")}
                    onRestore={() => restoreMedia("cover")}
                  />
                  <UploadField
                    label="Схема"
                    accept="image/jpeg,image/png,image/webp"
                    mediaType="image"
                    previewUrl={diagramPreview}
                    selectedFileName={diagramFile?.name}
                    existingFileName={getStorageFileName(initialData?.diagramImagePath)}
                    hasExistingFile={hasExistingDiagram}
                    isMarkedForRemoval={diagramMarkedForRemoval}
                    onChange={(file) => handleImageSelection(file, "diagram")}
                    onRemove={() => removeMedia("diagram")}
                    onRestore={() => restoreMedia("diagram")}
                  />
                  <UploadField
                    label="Відеофайл"
                    accept="video/mp4"
                    mediaType="video"
                    selectedFileName={videoFile?.name}
                    existingFileName={getStorageFileName(initialData?.videoPath)}
                    hasExistingFile={hasExistingVideo}
                    isMarkedForRemoval={videoMarkedForRemoval}
                    onChange={handleVideoSelection}
                    onRemove={() => removeMedia("video")}
                    onRestore={() => restoreMedia("video")}
                  />
                  <Field label="Зовнішнє відео">
                    <div className="space-y-3">
                      <input
                        type="url"
                        value={form.externalVideoUrl}
                        onChange={(event) =>
                          updateForm("externalVideoUrl", event.target.value)
                        }
                        placeholder="https://youtube.com/..."
                        className={inputClass}
                      />
                      {form.externalVideoUrl.trim() ? (
                        <button
                          type="button"
                          onClick={clearExternalVideo}
                          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-rose-200 px-4 text-sm font-black text-rose-600 transition hover:border-rose-300 hover:bg-rose-50"
                        >
                          Очистити посилання
                        </button>
                      ) : null}
                    </div>
                  </Field>
                </div>
              </ContentCard>
            </FormArea>
            </div>
          }
          sidebar={
            <ExerciseFormSidebar
              title={form.title}
              category={previewCategory}
              difficulty={previewDifficulty}
              durationMinutes={form.durationMinutes}
              minPlayers={form.minPlayers}
              maxPlayers={form.maxPlayers}
              playerFormat={previewPlayerFormat}
              selectedGoalLabels={selectedGoalLabels}
              coverPreview={coverPreview}
              diagramPreview={diagramPreview}
              coverFile={coverFile}
              diagramFile={diagramFile}
              videoFile={videoFile}
              hasExistingCover={hasExistingCover}
              hasExistingDiagram={hasExistingDiagram}
              hasExistingVideo={hasExistingVideo}
              coverMarkedForRemoval={coverMarkedForRemoval}
              diagramMarkedForRemoval={diagramMarkedForRemoval}
              videoMarkedForRemoval={videoMarkedForRemoval}
              status={currentStatus}
            />
          }
        />
      </form>
    </ExerciseWorkspaceShell>
  );
}

function FormArea({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section>
      <div className="mb-5 border-b border-slate-200 pb-5">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-sky-600">
          {eyebrow}
        </p>
        <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
          {title}
        </h2>
        <p className="mt-2 max-w-3xl font-semibold leading-7 text-slate-500">
          {description}
        </p>
      </div>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={className}>
      <span className="mb-2 block font-black text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function getStorageFileName(path?: string | null) {
  if (!path) return undefined;

  const pathWithoutQuery = path.split("?")[0];
  const fileName = pathWithoutQuery.split("/").filter(Boolean).pop();

  if (!fileName) return undefined;

  try {
    return decodeURIComponent(fileName);
  } catch {
    return fileName;
  }
}

type UploadFieldProps = {
  label: string;
  accept: string;
  mediaType: "image" | "video";
  previewUrl?: string | null;
  selectedFileName?: string;
  existingFileName?: string;
  hasExistingFile: boolean;
  isMarkedForRemoval: boolean;
  onChange: (file: File | null) => void;
  onRemove: () => void;
  onRestore: () => void;
};

function UploadField({
  label,
  accept,
  mediaType,
  previewUrl,
  selectedFileName,
  existingFileName,
  hasExistingFile,
  isMarkedForRemoval,
  onChange,
  onRemove,
  onRestore,
}: UploadFieldProps) {
  const inputId = useId();
  const isNewFile = Boolean(selectedFileName);
  const displayedFileName = selectedFileName || existingFileName;
  const hasCurrentFile = isNewFile || hasExistingFile;
  const hasImagePreview = mediaType === "image" && Boolean(previewUrl);
  const actionLabel = hasCurrentFile ? "Замінити" : "Обрати файл";

  const hiddenInput = (
    <input
      id={inputId}
      type="file"
      accept={accept}
      onChange={(event) => {
        onChange(event.target.files?.[0] ?? null);
        event.currentTarget.value = "";
      }}
      className="sr-only"
    />
  );

  return (
    <div className="block min-w-0">
      <span className="mb-2 block font-black text-slate-700">{label}</span>

      {isMarkedForRemoval ? (
        <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-rose-300 bg-rose-50 px-5 text-center">
          <span className="text-3xl" aria-hidden="true">🗑️</span>
          <span className="mt-3 text-sm font-black text-rose-700">
            Файл буде видалено після збереження
          </span>
          {displayedFileName ? (
            <span className="mt-1 max-w-full truncate text-xs font-bold text-rose-400">
              {displayedFileName}
            </span>
          ) : null}
          <button
            type="button"
            onClick={onRestore}
            className="mt-4 rounded-xl border border-rose-200 bg-white px-4 py-2 text-sm font-black text-rose-600 transition hover:border-rose-300 hover:bg-rose-100"
          >
            Скасувати видалення
          </button>
        </div>
      ) : hasImagePreview ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
            <Image
              src={previewUrl ?? ""}
              alt={`Попередній перегляд: ${label.toLocaleLowerCase("uk")}`}
              fill
              sizes="(max-width: 768px) 100vw, 420px"
              className="object-cover"
              unoptimized={previewUrl?.startsWith("blob:")}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-transparent to-slate-950/10" />
            <span className={`absolute left-3 top-3 rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] ${
              isNewFile
                ? "bg-sky-500 text-slate-950"
                : "bg-white/90 text-slate-700 backdrop-blur"
            }`}>
              {isNewFile ? "Новий файл" : "Поточний файл"}
            </span>
            <label
              htmlFor={inputId}
              className="absolute bottom-3 right-3 inline-flex min-h-10 cursor-pointer items-center justify-center rounded-xl bg-white px-4 text-sm font-black text-slate-950 shadow-lg transition hover:bg-sky-100"
            >
              {actionLabel}
            </label>
          </div>
          <div className="px-4 py-3">
            <p className="truncate text-sm font-black text-slate-700">
              {displayedFileName || label}
            </p>
            <p className={`mt-1 text-xs font-bold ${isNewFile ? "text-sky-600" : "text-slate-400"}`}>
              {isNewFile
                ? "Буде збережено після підтвердження"
                : "Збережено в бібліотеці вправ"}
            </p>
          </div>
          {hiddenInput}
        </div>
      ) : hasCurrentFile && mediaType === "video" ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <div className="flex items-start gap-4">
            <span
              aria-hidden="true"
              className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-2xl"
            >
              🎬
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-black text-slate-800">Відеофайл додано</p>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${
                  isNewFile
                    ? "bg-sky-100 text-sky-700"
                    : "bg-emerald-100 text-emerald-700"
                }`}>
                  {isNewFile ? "Новий" : "Збережений"}
                </span>
              </div>
              <p className="mt-1 truncate text-sm font-bold text-slate-500">
                {displayedFileName || "Відеофайл вправи"}
              </p>
              {isNewFile ? (
                <p className="mt-1 text-xs font-bold text-sky-600">
                  Буде збережено після підтвердження
                </p>
              ) : null}
            </div>
          </div>
          <label
            htmlFor={inputId}
            className="mt-4 inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-black text-slate-800 transition hover:border-sky-400 hover:bg-sky-50"
          >
            Замінити
          </label>
          {hiddenInput}
        </div>
      ) : (
        <>
          <label
            htmlFor={inputId}
            className="flex min-h-48 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 text-center transition hover:border-sky-400 hover:bg-sky-50"
          >
            <span className="text-3xl" aria-hidden="true">＋</span>
            <span className="mt-3 text-sm font-black text-slate-700">
              Обрати файл
            </span>
            <span className="mt-1 text-xs font-bold text-slate-400">
              Файл ще не додано
            </span>
          </label>
          {hiddenInput}
        </>
      )}

      {hasCurrentFile && !isMarkedForRemoval ? (
        <button
          type="button"
          onClick={onRemove}
          className="mt-3 inline-flex min-h-11 items-center justify-center rounded-xl border border-rose-200 px-4 text-sm font-black text-rose-600 transition hover:border-rose-300 hover:bg-rose-50"
        >
          Видалити
        </button>
      ) : null}
    </div>
  );
}

