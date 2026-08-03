import { extractStandardZip } from "./zip-reader";

import type {
  ExerciseMediaKind,
  ExerciseMediaPreviewRow,
  ParsedExerciseMediaSelection,
} from "../types";

const MAX_ARCHIVE_BYTES = 100 * 1024 * 1024;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MIN_IMAGE_WIDTH = 320;
const MIN_IMAGE_HEIGHT = 180;
const MAX_IMAGE_DIMENSION = 12_000;

const SUPPORTED_EXTENSIONS = new Set(["png", "jpg", "jpeg", "webp"]);

const MIME_BY_EXTENSION: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

function baseName(path: string) {
  return path.split(/[\\/]/).pop() ?? path;
}

function shouldIgnorePath(path: string) {
  const normalized = path.replace(/\\/g, "/");
  const name = baseName(normalized);

  return (
    normalized.startsWith("__MACOSX/") ||
    name === ".DS_Store" ||
    name.startsWith("._") ||
    !name
  );
}

function parseMediaFileName(fileName: string) {
  const match = fileName.match(
    /^([a-z0-9][a-z0-9_-]{1,79})-(cover|diagram)\.(png|jpe?g|webp)$/i,
  );

  if (!match) {
    return {
      code: null,
      kind: null,
      extension: null,
      issue:
        "Назва має відповідати формату CODE-cover.png або CODE-diagram.png.",
    } as const;
  }

  return {
    code: match[1].toUpperCase(),
    kind: match[2].toLowerCase() as ExerciseMediaKind,
    extension: match[3].toLowerCase(),
    issue: null,
  } as const;
}

async function readImageDimensions(file: File) {
  if (typeof createImageBitmap !== "function") {
    return { width: null, height: null };
  }

  try {
    const bitmap = await createImageBitmap(file);
    const dimensions = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return dimensions;
  } catch {
    return { width: null, height: null };
  }
}

async function createPreviewRow(
  file: File,
  sourcePath: string,
  rowNumber: number,
): Promise<ExerciseMediaPreviewRow> {
  const issues: string[] = [];
  const fileName = baseName(sourcePath);
  const parsedName = parseMediaFileName(fileName);

  if (parsedName.issue) issues.push(parsedName.issue);

  if (file.size === 0) {
    issues.push("Файл порожній.");
  } else if (file.size > MAX_IMAGE_BYTES) {
    issues.push("Розмір зображення перевищує 10 МБ.");
  }

  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (!SUPPORTED_EXTENSIONS.has(extension)) {
    issues.push("Підтримуються лише PNG, JPG, JPEG і WEBP.");
  }

  const { width, height } = await readImageDimensions(file);

  if (width === null || height === null) {
    issues.push("Не вдалося прочитати зображення або визначити його розмір.");
  } else {
    if (width < MIN_IMAGE_WIDTH || height < MIN_IMAGE_HEIGHT) {
      issues.push(
        `Зображення замале. Мінімальний розмір — ${MIN_IMAGE_WIDTH}×${MIN_IMAGE_HEIGHT}px.`,
      );
    }

    if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
      issues.push(`Одна зі сторін зображення перевищує ${MAX_IMAGE_DIMENSION}px.`);
    }
  }

  return {
    rowNumber,
    file,
    fileName,
    sourcePath,
    code: parsedName.code,
    kind: parsedName.kind,
    width,
    height,
    issues,
    exercise: null,
    existingPath: null,
    status: issues.length > 0 ? "error" : "ready",
  };
}

function attachSelectionDuplicateIssues(rows: ExerciseMediaPreviewRow[]) {
  const indexesByKey = new Map<string, number[]>();

  rows.forEach((row, index) => {
    if (!row.code || !row.kind) return;
    const key = `${row.code}:${row.kind}`;
    const indexes = indexesByKey.get(key) ?? [];
    indexes.push(index);
    indexesByKey.set(key, indexes);
  });

  for (const indexes of indexesByKey.values()) {
    if (indexes.length < 2) continue;

    for (const index of indexes) {
      rows[index] = {
        ...rows[index],
        issues: [
          ...rows[index].issues,
          "У вибраних файлах є кілька медіа одного типу для цієї вправи.",
        ],
        status: "error",
      };
    }
  }

  return rows;
}

async function parseZipFile(file: File) {
  if (file.size > MAX_ARCHIVE_BYTES) {
    throw new Error("Розмір ZIP-архіву перевищує 100 МБ.");
  }

  const entries = await extractStandardZip(file);
  const mediaEntries = entries.filter((entry) => {
    if (shouldIgnorePath(entry.path)) return false;

    const fileName = baseName(entry.path);
    const extension = fileName.split(".").pop()?.toLowerCase() ?? "";

    return (
      SUPPORTED_EXTENSIONS.has(extension) ||
      /-(cover|diagram)\.[^.]+$/i.test(fileName)
    );
  });

  if (mediaEntries.length === 0) {
    throw new Error("У ZIP-архіві не знайдено обкладинок або схем для імпорту.");
  }

  const rows = await Promise.all(
    mediaEntries.map(async (entry, index) => {
      const fileName = baseName(entry.path);
      const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
      const safeBytes = Uint8Array.from(entry.bytes);
      const extractedFile = new File([safeBytes.buffer], fileName, {
        type: MIME_BY_EXTENSION[extension] ?? "application/octet-stream",
      });

      return createPreviewRow(extractedFile, entry.path, index + 1);
    }),
  );

  return {
    sourceLabel: file.name,
    rows: attachSelectionDuplicateIssues(rows),
  } satisfies ParsedExerciseMediaSelection;
}

async function parseLooseImages(files: File[]) {
  if (files.length > 200) {
    throw new Error("За один раз можна обрати не більше 200 файлів.");
  }

  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  if (totalSize > MAX_ARCHIVE_BYTES) {
    throw new Error("Загальний розмір вибраних файлів перевищує 100 МБ.");
  }

  const rows = await Promise.all(
    files.map((file, index) => createPreviewRow(file, file.name, index + 1)),
  );

  return {
    sourceLabel:
      files.length === 1 ? files[0].name : `Обрано файлів: ${files.length}`,
    rows: attachSelectionDuplicateIssues(rows),
  } satisfies ParsedExerciseMediaSelection;
}

export async function parseExerciseMediaSelection(files: File[]) {
  if (files.length === 0) {
    throw new Error("Оберіть ZIP-архів або зображення.");
  }

  const zipFiles = files.filter(
    (file) => file.name.toLowerCase().endsWith(".zip") || file.type === "application/zip",
  );

  if (zipFiles.length > 0) {
    if (files.length !== 1 || zipFiles.length !== 1) {
      throw new Error("ZIP потрібно завантажувати окремо від інших файлів.");
    }

    return parseZipFile(zipFiles[0]);
  }

  return parseLooseImages(files);
}
