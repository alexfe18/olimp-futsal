import type { ExerciseImportFormat } from "../types";

export type ParsedExerciseImportFile = {
  format: ExerciseImportFormat;
  rows: Array<Record<string, unknown>>;
};

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

function normalizeHeader(value: string) {
  return value.trim().replace(/^\uFEFF/, "");
}

function ensureObject(value: unknown, rowNumber: number) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`Рядок ${rowNumber}: очікувався об'єкт вправи.`);
  }

  return value as Record<string, unknown>;
}

function parseJson(text: string): Array<Record<string, unknown>> {
  let parsed: unknown;

  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("JSON-файл має некоректний синтаксис.");
  }

  const rows = Array.isArray(parsed)
    ? parsed
    : typeof parsed === "object" &&
        parsed !== null &&
        "exercises" in parsed &&
        Array.isArray(parsed.exercises)
      ? parsed.exercises
      : null;

  if (!rows) {
    throw new Error(
      'JSON повинен містити масив вправ або об\'єкт із полем "exercises".',
    );
  }

  if (rows.length === 0) {
    throw new Error("Файл не містить вправ для імпорту.");
  }

  return rows.map((row, index) => ensureObject(row, index + 1));
}

function detectDelimiter(headerLine: string) {
  const candidates = [";", ",", "\t"] as const;

  return candidates.reduce(
    (best, candidate) => {
      const count = headerLine.split(candidate).length - 1;
      return count > best.count ? { delimiter: candidate, count } : best;
    },
    { delimiter: ";" as string, count: -1 },
  ).delimiter;
}

function parseCsvRows(text: string, delimiter: string) {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let insideQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const nextCharacter = text[index + 1];

    if (character === '"') {
      if (insideQuotes && nextCharacter === '"') {
        currentCell += '"';
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
      continue;
    }

    if (!insideQuotes && character === delimiter) {
      currentRow.push(currentCell);
      currentCell = "";
      continue;
    }

    if (!insideQuotes && (character === "\n" || character === "\r")) {
      if (character === "\r" && nextCharacter === "\n") {
        index += 1;
      }

      currentRow.push(currentCell);
      currentCell = "";

      if (currentRow.some((cell) => cell.trim() !== "")) {
        rows.push(currentRow);
      }

      currentRow = [];
      continue;
    }

    currentCell += character;
  }

  if (insideQuotes) {
    throw new Error("CSV містить незакриті лапки.");
  }

  currentRow.push(currentCell);
  if (currentRow.some((cell) => cell.trim() !== "")) {
    rows.push(currentRow);
  }

  return rows;
}

function parseCsv(text: string): Array<Record<string, unknown>> {
  const normalizedText = text.replace(/^\uFEFF/, "");
  const firstLine = normalizedText.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = detectDelimiter(firstLine);
  const rows = parseCsvRows(normalizedText, delimiter);

  if (rows.length < 2) {
    throw new Error("CSV повинен містити заголовки та щонайменше одну вправу.");
  }

  const headers = rows[0].map(normalizeHeader);

  if (headers.some((header) => header === "")) {
    throw new Error("CSV містить порожню назву колонки.");
  }

  const duplicateHeaders = headers.filter(
    (header, index) => headers.indexOf(header) !== index,
  );

  if (duplicateHeaders.length > 0) {
    throw new Error(
      `CSV містить дубльовані колонки: ${[...new Set(duplicateHeaders)].join(", ")}.`,
    );
  }

  return rows.slice(1).map((row) =>
    Object.fromEntries(
      headers.map((header, index) => [header, row[index]?.trim() ?? ""]),
    ),
  );
}

export async function parseExerciseImportFile(
  file: File,
): Promise<ParsedExerciseImportFile> {
  if (file.size === 0) {
    throw new Error("Обраний файл порожній.");
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error("Розмір файлу не повинен перевищувати 5 МБ.");
  }

  const extension = file.name.split(".").pop()?.toLowerCase();
  const text = await file.text();

  if (extension === "json" || file.type.includes("json")) {
    return { format: "json", rows: parseJson(text) };
  }

  if (
    extension === "csv" ||
    file.type.includes("csv") ||
    file.type === "text/plain"
  ) {
    return { format: "csv", rows: parseCsv(text) };
  }

  throw new Error("Підтримуються лише файли JSON та CSV.");
}
