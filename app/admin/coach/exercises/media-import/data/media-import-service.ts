import { supabase } from "@/lib/supabase";

import type {
  ExistingExerciseMedia,
  ExerciseMediaImportProgress,
  ExerciseMediaImportRowResult,
  ExerciseMediaImportSummary,
  ExerciseMediaPreviewRow,
  ExerciseMediaReplacementStrategy,
} from "../types";

type ExistingExerciseRow = {
  id: string;
  code: string | null;
  title: string;
  cover_image_path: string | null;
  diagram_image_path: string | null;
};

function uniqueValues(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function mapExistingExercise(row: ExistingExerciseRow): ExistingExerciseMedia {
  return {
    id: row.id,
    code: row.code ?? "",
    title: row.title,
    coverImagePath: row.cover_image_path,
    diagramImagePath: row.diagram_image_path,
  };
}

export async function attachExerciseMediaTargets(
  rows: ExerciseMediaPreviewRow[],
): Promise<ExerciseMediaPreviewRow[]> {
  const validCodes = uniqueValues(
    rows.flatMap((row) =>
      row.code && row.issues.length === 0 ? [row.code] : [],
    ),
  );

  if (validCodes.length === 0) return rows;

  const { data, error } = await supabase
    .from("exercises")
    .select("id, code, title, cover_image_path, diagram_image_path")
    .in("code", validCodes);

  if (error) {
    throw new Error(`Не вдалося знайти вправи за кодами: ${error.message}`);
  }

  const existingByCode = new Map(
    ((data ?? []) as ExistingExerciseRow[])
      .filter((exercise) => Boolean(exercise.code))
      .map((exercise) => [exercise.code as string, mapExistingExercise(exercise)]),
  );

  return rows.map((row) => {
    if (row.issues.length > 0 || !row.code || !row.kind) {
      return { ...row, status: "error" };
    }

    const exercise = existingByCode.get(row.code) ?? null;
    if (!exercise) {
      return {
        ...row,
        issues: [...row.issues, `Вправу з кодом ${row.code} не знайдено.`],
        exercise: null,
        existingPath: null,
        status: "error",
      };
    }

    const existingPath =
      row.kind === "cover"
        ? exercise.coverImagePath
        : exercise.diagramImagePath;

    return {
      ...row,
      exercise,
      existingPath,
      status: existingPath ? "replacement" : "ready",
    };
  });
}

function createStoragePath(row: ExerciseMediaPreviewRow) {
  if (!row.exercise || !row.kind) {
    throw new Error("Не вдалося визначити вправу або тип медіа.");
  }

  const extension = row.fileName.split(".").pop()?.toLowerCase() || "bin";
  return `${row.exercise.id}/${row.kind}-${crypto.randomUUID()}.${extension}`;
}

async function removeUploadedPath(path: string) {
  const { error } = await supabase.storage.from("exercise-media").remove([path]);
  if (error) console.error("Exercise media rollback cleanup error:", error);
}

async function importMediaRow(row: ExerciseMediaPreviewRow) {
  if (!row.exercise || !row.kind || !row.code) {
    throw new Error("Не вдалося визначити вправу для медіа.");
  }

  const storagePath = createStoragePath(row);
  const column =
    row.kind === "cover" ? "cover_image_path" : "diagram_image_path";

  const { error: uploadError } = await supabase.storage
    .from("exercise-media")
    .upload(storagePath, row.file, { cacheControl: "3600", upsert: false });

  if (uploadError) {
    throw new Error(
      `Не вдалося завантажити «${row.fileName}»: ${uploadError.message}`,
    );
  }

  const { error: updateError } = await supabase
    .from("exercises")
    .update({ [column]: storagePath })
    .eq("id", row.exercise.id);

  if (updateError) {
    await removeUploadedPath(storagePath);
    throw new Error(`Не вдалося оновити вправу: ${updateError.message}`);
  }

  let cleanupWarning = false;

  if (row.existingPath) {
    const { error: cleanupError } = await supabase.storage
      .from("exercise-media")
      .remove([row.existingPath]);

    if (cleanupError) {
      cleanupWarning = true;
      console.error("Old exercise media cleanup error:", cleanupError);
    }
  }

  return { storagePath, cleanupWarning };
}

export async function importExerciseMedia(
  rows: ExerciseMediaPreviewRow[],
  replacementStrategy: ExerciseMediaReplacementStrategy,
  onProgress?: (progress: ExerciseMediaImportProgress) => void,
): Promise<ExerciseMediaImportSummary> {
  const eligibleRows = rows.filter(
    (row) =>
      row.issues.length === 0 &&
      row.exercise !== null &&
      row.kind !== null &&
      row.code !== null,
  );

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Сесію адміністратора не знайдено.");
  }

  const results: ExerciseMediaImportRowResult[] = [];
  let cleanupWarnings = 0;

  for (let index = 0; index < eligibleRows.length; index += 1) {
    const row = eligibleRows[index];
    const exercise = row.exercise;
    const kind = row.kind;
    const code = row.code;

    if (!exercise || !kind || !code) continue;

    try {
      if (row.status === "replacement" && replacementStrategy === "skip") {
        results.push({
          rowNumber: row.rowNumber,
          code,
          title: exercise.title,
          kind,
          fileName: row.fileName,
          status: "skipped",
          message: "Існуюче медіа залишено без змін.",
        });
      } else {
        const { cleanupWarning } = await importMediaRow(row);
        if (cleanupWarning) cleanupWarnings += 1;

        results.push({
          rowNumber: row.rowNumber,
          code,
          title: exercise.title,
          kind,
          fileName: row.fileName,
          status: row.status === "replacement" ? "replaced" : "added",
          message:
            row.status === "replacement"
              ? cleanupWarning
                ? "Медіа замінено, але старий файл не вдалося видалити зі Storage."
                : "Існуюче медіа успішно замінено."
              : "Нове медіа успішно додано.",
        });
      }
    } catch (error) {
      console.error("Exercise media import row error:", error);
      results.push({
        rowNumber: row.rowNumber,
        code,
        title: exercise.title,
        kind,
        fileName: row.fileName,
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Не вдалося імпортувати медіа.",
      });
    }

    onProgress?.({ current: index + 1, total: eligibleRows.length });
  }

  return {
    added: results.filter((result) => result.status === "added").length,
    replaced: results.filter((result) => result.status === "replaced").length,
    skipped: results.filter((result) => result.status === "skipped").length,
    failed: results.filter((result) => result.status === "error").length,
    cleanupWarnings,
    results,
  };
}
