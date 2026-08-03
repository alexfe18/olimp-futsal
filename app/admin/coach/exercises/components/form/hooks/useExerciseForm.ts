"use client";

import { useMemo, useState } from "react";

import { supabase } from "@/lib/supabase";

import {
  categoryOptions,
  difficultyOptions,
  emptyExerciseForm,
  getOptionLabel,
  goalOptions,
} from "../config/exercise-options";
import type {
  ExerciseFormInitialData,
  ExerciseFormMessage,
  ExerciseFormMode,
  ExerciseFormValues,
  ExercisePersistedStatus,
} from "../types/exercise-form";

type UseExerciseFormOptions = {
  mode: ExerciseFormMode;
  initialData?: ExerciseFormInitialData;
};

type ExerciseMediaPaths = {
  coverImagePath: string | null;
  diagramImagePath: string | null;
  videoPath: string | null;
};

type ExerciseMediaKind = "cover" | "diagram" | "video";

type ExerciseRemovedMedia = Record<ExerciseMediaKind, boolean>;

function createStoragePath(file: File, exerciseId: string, prefix: string) {
  const extension = file.name.split(".").pop()?.toLowerCase() || "bin";
  return `${exerciseId}/${prefix}-${crypto.randomUUID()}.${extension}`;
}

function parseOptionalInteger(value: string) {
  if (!value.trim()) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function normalizeUniqueValues(values: string[]) {
  const normalizedValues = new Set<string>();

  for (const value of values) {
    const normalizedValue = value.trim();
    if (normalizedValue) normalizedValues.add(normalizedValue);
  }

  return Array.from(normalizedValues);
}

function createFileFingerprint(file: File | null) {
  if (!file) return null;

  return {
    name: file.name,
    size: file.size,
    type: file.type,
    lastModified: file.lastModified,
  };
}

function createFormSnapshot({
  form,
  selectedGoals,
  selectedAgeGroups,
  tags,
  coverFile,
  diagramFile,
  videoFile,
  removedMedia,
}: {
  form: ExerciseFormValues;
  selectedGoals: string[];
  selectedAgeGroups: string[];
  tags: string[];
  coverFile: File | null;
  diagramFile: File | null;
  videoFile: File | null;
  removedMedia: ExerciseRemovedMedia;
}) {
  return JSON.stringify({
    form,
    selectedGoals: normalizeUniqueValues(selectedGoals),
    selectedAgeGroups: normalizeUniqueValues(selectedAgeGroups).sort(),
    tags: normalizeUniqueValues(tags).sort((first, second) =>
      first.localeCompare(second, "uk"),
    ),
    coverFile: createFileFingerprint(coverFile),
    diagramFile: createFileFingerprint(diagramFile),
    videoFile: createFileFingerprint(videoFile),
    removedMedia,
  });
}

export function useExerciseForm({ mode, initialData }: UseExerciseFormOptions) {
  const [form, setForm] = useState<ExerciseFormValues>(
    initialData?.values ?? emptyExerciseForm,
  );
  const [selectedGoals, setSelectedGoals] = useState<string[]>(
    initialData?.selectedGoals ?? [],
  );
  const [selectedAgeGroups, setSelectedAgeGroups] = useState<string[]>(
    initialData?.selectedAgeGroups ?? [],
  );
  const [tags, setTags] = useState<string[]>(initialData?.tags ?? []);
  const [tagInput, setTagInput] = useState("");

  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [diagramFile, setDiagramFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [removedMedia, setRemovedMedia] = useState<ExerciseRemovedMedia>({
    cover: false,
    diagram: false,
    video: false,
  });

  const [coverPreview, setCoverPreview] = useState<string | null>(
    initialData?.coverImageUrl ?? null,
  );
  const [diagramPreview, setDiagramPreview] = useState<string | null>(
    initialData?.diagramImageUrl ?? null,
  );

  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<ExerciseFormMessage>(null);

  const currentStatus: ExercisePersistedStatus =
    initialData?.status ?? "draft";

  const initialSnapshot = useMemo(
    () =>
      createFormSnapshot({
        form: initialData?.values ?? emptyExerciseForm,
        selectedGoals: initialData?.selectedGoals ?? [],
        selectedAgeGroups: initialData?.selectedAgeGroups ?? [],
        tags: initialData?.tags ?? [],
        coverFile: null,
        diagramFile: null,
        videoFile: null,
        removedMedia: { cover: false, diagram: false, video: false },
      }),
    [initialData],
  );

  const currentSnapshot = useMemo(
    () =>
      createFormSnapshot({
        form,
        selectedGoals,
        selectedAgeGroups,
        tags,
        coverFile,
        diagramFile,
        videoFile,
        removedMedia,
      }),
    [
      coverFile,
      diagramFile,
      form,
      removedMedia,
      selectedAgeGroups,
      selectedGoals,
      tags,
      videoFile,
    ],
  );

  const hasUnsavedChanges = currentSnapshot !== initialSnapshot;

  const previewCategory = getOptionLabel(
    categoryOptions,
    form.category,
    "Комплексна",
  );
  const previewDifficulty = getOptionLabel(
    difficultyOptions,
    form.difficulty,
    "Середня",
  );
  const selectedGoalLabels = useMemo(
    () =>
      goalOptions
        .filter(([value]) => selectedGoals.includes(value))
        .map(([, label]) => label),
    [selectedGoals],
  );

  function updateForm<K extends keyof ExerciseFormValues>(
    field: K,
    value: ExerciseFormValues[K],
  ) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function toggleGoal(goal: string) {
    setSelectedGoals((current) =>
      current.includes(goal)
        ? current.filter((item) => item !== goal)
        : [...current, goal],
    );
  }

  function toggleAgeGroup(ageGroup: string) {
    setSelectedAgeGroups((current) =>
      current.includes(ageGroup)
        ? current.filter((item) => item !== ageGroup)
        : [...current, ageGroup],
    );
  }

  function addTag() {
    const normalized = tagInput.trim().replace(/^#/, "");
    const alreadyExists = tags.some(
      (tag) => tag.toLocaleLowerCase("uk") === normalized.toLocaleLowerCase("uk"),
    );

    if (!normalized || alreadyExists) {
      setTagInput("");
      return;
    }

    setTags((current) => [...current, normalized]);
    setTagInput("");
  }

  function removeTag(tag: string) {
    setTags((current) => current.filter((item) => item !== tag));
  }

  function handleImageSelection(file: File | null, kind: "cover" | "diagram") {
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    setRemovedMedia((current) => ({ ...current, [kind]: false }));

    if (kind === "cover") {
      if (coverPreview?.startsWith("blob:")) URL.revokeObjectURL(coverPreview);
      setCoverFile(file);
      setCoverPreview(previewUrl);
      return;
    }

    if (diagramPreview?.startsWith("blob:")) URL.revokeObjectURL(diagramPreview);
    setDiagramFile(file);
    setDiagramPreview(previewUrl);
  }

  function handleVideoSelection(file: File | null) {
    if (!file) return;
    setRemovedMedia((current) => ({ ...current, video: false }));
    setVideoFile(file);
  }

  function removeMedia(kind: ExerciseMediaKind) {
    if (kind === "cover") {
      if (coverPreview?.startsWith("blob:")) URL.revokeObjectURL(coverPreview);
      setCoverFile(null);
      setCoverPreview(null);
    }

    if (kind === "diagram") {
      if (diagramPreview?.startsWith("blob:")) URL.revokeObjectURL(diagramPreview);
      setDiagramFile(null);
      setDiagramPreview(null);
    }

    if (kind === "video") {
      setVideoFile(null);
    }

    const hasPersistedMedia =
      kind === "cover"
        ? Boolean(initialData?.coverImagePath)
        : kind === "diagram"
          ? Boolean(initialData?.diagramImagePath)
          : Boolean(initialData?.videoPath);

    setRemovedMedia((current) => ({
      ...current,
      [kind]: hasPersistedMedia,
    }));
  }

  function restoreMedia(kind: ExerciseMediaKind) {
    setRemovedMedia((current) => ({ ...current, [kind]: false }));

    if (kind === "cover") {
      setCoverFile(null);
      setCoverPreview(initialData?.coverImageUrl ?? null);
    }

    if (kind === "diagram") {
      setDiagramFile(null);
      setDiagramPreview(initialData?.diagramImageUrl ?? null);
    }

    if (kind === "video") {
      setVideoFile(null);
    }
  }

  function clearExternalVideo() {
    updateForm("externalVideoUrl", "");
  }

  async function uploadFile(
    exerciseId: string,
    file: File | null,
    prefix: string,
  ) {
    if (!file) return null;

    const path = createStoragePath(file, exerciseId, prefix);
    const { error } = await supabase.storage
      .from("exercise-media")
      .upload(path, file, { cacheControl: "3600", upsert: false });

    if (error) {
      throw new Error(
        `Не вдалося завантажити файл «${file.name}»: ${error.message}`,
      );
    }

    return path;
  }

  function validate() {
    const title = form.title.trim();
    const duration = Number.parseInt(form.durationMinutes, 10);
    const minPlayers = parseOptionalInteger(form.minPlayers);
    const maxPlayers = parseOptionalInteger(form.maxPlayers);

    if (title.length < 2) return "Вкажіть назву вправи.";
    if (Number.isNaN(duration) || duration < 1 || duration > 300) {
      return "Тривалість повинна бути від 1 до 300 хвилин.";
    }
    if (minPlayers !== null && maxPlayers !== null && minPlayers > maxPlayers) {
      return "Мінімальна кількість гравців не може перевищувати максимальну.";
    }

    return null;
  }

  function createExercisePayload(
    values: ExerciseFormValues,
    ageGroups: string[],
    goals: string[],
    status: ExercisePersistedStatus,
    mediaPaths?: ExerciseMediaPaths,
  ) {
    return {
      title: values.title.trim(),
      description: values.description.trim() || null,
      organization: values.organization.trim() || null,
      coaching_points: values.coachingPoints.trim() || null,
      common_mistakes: values.commonMistakes.trim() || null,
      equipment: values.equipment.trim() || null,
      category: values.category,
      exercise_type: values.exerciseType,
      player_format: values.playerFormat || null,
      min_players: parseOptionalInteger(values.minPlayers),
      max_players: parseOptionalInteger(values.maxPlayers),
      duration_minutes: Number.parseInt(values.durationMinutes, 10),
      difficulty: values.difficulty,
      age_groups: normalizeUniqueValues(ageGroups),
      external_video_url: values.externalVideoUrl.trim() || null,
      primary_goal: normalizeUniqueValues(goals)[0] ?? null,
      status,
      ...(mediaPaths
        ? {
            cover_image_path: mediaPaths.coverImagePath,
            diagram_image_path: mediaPaths.diagramImagePath,
            video_path: mediaPaths.videoPath,
          }
        : {}),
    };
  }

  async function replaceExerciseGoals(exerciseId: string, goals: string[]) {
    const { error: deleteError } = await supabase
      .from("exercise_goals")
      .delete()
      .eq("exercise_id", exerciseId);

    if (deleteError) throw new Error(deleteError.message);

    const normalizedGoals = normalizeUniqueValues(goals);
    if (normalizedGoals.length === 0) return;

    const { error: insertError } = await supabase.from("exercise_goals").insert(
      normalizedGoals.map((goal) => ({ exercise_id: exerciseId, goal })),
    );

    if (insertError) throw new Error(insertError.message);
  }

  async function replaceExerciseTags(exerciseId: string, nextTags: string[]) {
    const { error: deleteError } = await supabase
      .from("exercise_tags")
      .delete()
      .eq("exercise_id", exerciseId);

    if (deleteError) throw new Error(deleteError.message);

    const normalizedTags = normalizeUniqueValues(nextTags);
    if (normalizedTags.length === 0) return;

    const { error: insertError } = await supabase.from("exercise_tags").insert(
      normalizedTags.map((tag) => ({ exercise_id: exerciseId, tag })),
    );

    if (insertError) throw new Error(insertError.message);
  }

  async function removeStoragePaths(paths: Array<string | null | undefined>) {
    const normalizedPaths = normalizeUniqueValues(
      paths.filter((path): path is string => Boolean(path)),
    );

    if (normalizedPaths.length === 0) return;

    const { error } = await supabase.storage
      .from("exercise-media")
      .remove(normalizedPaths);

    if (error) {
      console.error("Exercise media cleanup error:", error);
    }
  }

  async function saveNewExercise(status: ExercisePersistedStatus, userId: string) {
    let createdExerciseId: string | null = null;
    const uploadedPaths: string[] = [];

    try {
      const { data: exercise, error: exerciseError } = await supabase
        .from("exercises")
        .insert({
          ...createExercisePayload(
            form,
            selectedAgeGroups,
            selectedGoals,
            status,
          ),
          created_by: userId,
        })
        .select("id")
        .single();

      if (exerciseError) throw new Error(exerciseError.message);

      const exerciseId = exercise.id as string;
      createdExerciseId = exerciseId;

      const coverImagePath = await uploadFile(exerciseId, coverFile, "cover");
      if (coverImagePath) uploadedPaths.push(coverImagePath);

      const diagramImagePath = await uploadFile(
        exerciseId,
        diagramFile,
        "diagram",
      );
      if (diagramImagePath) uploadedPaths.push(diagramImagePath);

      const videoPath = await uploadFile(exerciseId, videoFile, "video");
      if (videoPath) uploadedPaths.push(videoPath);

      if (coverImagePath || diagramImagePath || videoPath) {
        const { error: mediaUpdateError } = await supabase
          .from("exercises")
          .update({
            cover_image_path: coverImagePath,
            diagram_image_path: diagramImagePath,
            video_path: videoPath,
          })
          .eq("id", exerciseId);

        if (mediaUpdateError) throw new Error(mediaUpdateError.message);
      }

      await replaceExerciseGoals(exerciseId, selectedGoals);
      await replaceExerciseTags(exerciseId, tags);

      setMessage({
        type: "success",
        text:
          status === "active"
            ? "Вправу створено та опубліковано."
            : "Вправу збережено як чернетку.",
      });

      return exerciseId;
    } catch (error) {
      await removeStoragePaths(uploadedPaths);

      if (createdExerciseId) {
        await supabase.from("exercises").delete().eq("id", createdExerciseId);
      }

      throw error;
    }
  }

  async function saveExistingExercise(status: ExercisePersistedStatus) {
    if (!initialData?.id) {
      throw new Error("Не вдалося визначити вправу для редагування.");
    }

    const exerciseId = initialData.id;
    const uploadedPaths: string[] = [];
    let exerciseWasUpdated = false;

    const previousMediaPaths: ExerciseMediaPaths = {
      coverImagePath: initialData.coverImagePath ?? null,
      diagramImagePath: initialData.diagramImagePath ?? null,
      videoPath: initialData.videoPath ?? null,
    };

    const initialPayload = createExercisePayload(
      initialData.values,
      initialData.selectedAgeGroups,
      initialData.selectedGoals,
      initialData.status,
      previousMediaPaths,
    );

    try {
      const uploadedCoverPath = await uploadFile(
        exerciseId,
        coverFile,
        "cover",
      );
      if (uploadedCoverPath) uploadedPaths.push(uploadedCoverPath);

      const uploadedDiagramPath = await uploadFile(
        exerciseId,
        diagramFile,
        "diagram",
      );
      if (uploadedDiagramPath) uploadedPaths.push(uploadedDiagramPath);

      const uploadedVideoPath = await uploadFile(
        exerciseId,
        videoFile,
        "video",
      );
      if (uploadedVideoPath) uploadedPaths.push(uploadedVideoPath);

      const nextMediaPaths: ExerciseMediaPaths = {
        coverImagePath:
          uploadedCoverPath ??
          (removedMedia.cover ? null : previousMediaPaths.coverImagePath),
        diagramImagePath:
          uploadedDiagramPath ??
          (removedMedia.diagram ? null : previousMediaPaths.diagramImagePath),
        videoPath:
          uploadedVideoPath ??
          (removedMedia.video ? null : previousMediaPaths.videoPath),
      };

      const { error: updateError } = await supabase
        .from("exercises")
        .update(
          createExercisePayload(
            form,
            selectedAgeGroups,
            selectedGoals,
            status,
            nextMediaPaths,
          ),
        )
        .eq("id", exerciseId);

      if (updateError) throw new Error(updateError.message);
      exerciseWasUpdated = true;

      await replaceExerciseGoals(exerciseId, selectedGoals);
      await replaceExerciseTags(exerciseId, tags);

      await removeStoragePaths([
        coverFile || removedMedia.cover
          ? previousMediaPaths.coverImagePath
          : null,
        diagramFile || removedMedia.diagram
          ? previousMediaPaths.diagramImagePath
          : null,
        videoFile || removedMedia.video
          ? previousMediaPaths.videoPath
          : null,
      ]);

      setMessage({
        type: "success",
        text: "Зміни вправи успішно збережено.",
      });

      return exerciseId;
    } catch (error) {
      if (exerciseWasUpdated) {
        const { error: rollbackExerciseError } = await supabase
          .from("exercises")
          .update(initialPayload)
          .eq("id", exerciseId);

        if (rollbackExerciseError) {
          console.error("Exercise rollback error:", rollbackExerciseError);
        }

        try {
          await replaceExerciseGoals(exerciseId, initialData.selectedGoals);
          await replaceExerciseTags(exerciseId, initialData.tags);
        } catch (rollbackRelationsError) {
          console.error(
            "Exercise relations rollback error:",
            rollbackRelationsError,
          );
        }
      }

      await removeStoragePaths(uploadedPaths);
      throw error;
    }
  }

  async function saveExercise(
    status: ExercisePersistedStatus,
  ): Promise<string | null> {
    const validationError = validate();
    if (validationError) {
      setMessage({ type: "error", text: validationError });
      return null;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("Сесію адміністратора не знайдено.");
      }

      if (mode === "edit") {
        return await saveExistingExercise(status);
      }

      return await saveNewExercise(status, user.id);
    } catch (error) {
      console.error("Exercise saving error:", error);

      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : mode === "edit"
              ? "Не вдалося зберегти зміни вправи."
              : "Не вдалося створити вправу.",
      });
      return null;
    } finally {
      setIsSaving(false);
    }
  }

  return {
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
    hasExistingCover: Boolean(initialData?.coverImagePath),
    hasExistingDiagram: Boolean(initialData?.diagramImagePath),
    hasExistingVideo: Boolean(initialData?.videoPath),
    coverMarkedForRemoval: removedMedia.cover,
    diagramMarkedForRemoval: removedMedia.diagram,
    videoMarkedForRemoval: removedMedia.video,
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
  };
}
