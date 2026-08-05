import fs from "node:fs";
import path from "node:path";

export function loadLocalEnv(projectRoot = process.cwd()) {
  const candidates = [".env.local", ".env", ".env.production.local"];

  for (const fileName of candidates) {
    const filePath = path.join(projectRoot, fileName);
    if (!fs.existsSync(filePath)) continue;

    const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const separatorIndex = line.indexOf("=");
      if (separatorIndex < 1) continue;

      const key = line.slice(0, separatorIndex).trim();
      let value = line.slice(separatorIndex + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = value;
    }
  }
}

export function parseArguments(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      result[key] = true;
    } else {
      result[key] = next;
      index += 1;
    }
  }
  return result;
}

function detectDelimiter(headerLine) {
  const semicolons = (headerLine.match(/;/g) ?? []).length;
  const commas = (headerLine.match(/,/g) ?? []).length;
  return semicolons >= commas ? ";" : ",";
}

export function parseCsv(text) {
  const normalized = text.replace(/^\uFEFF/, "");
  const delimiter = detectDelimiter(normalized.split(/\r?\n/, 1)[0] ?? "");
  const rows = [];
  let row = [];
  let value = "";
  let inQuotes = false;

  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index];
    const next = normalized[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        value += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && char === delimiter) {
      row.push(value);
      value = "";
      continue;
    }

    if (!inQuotes && (char === "\n" || char === "\r")) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(value);
      value = "";
      if (row.some((cell) => cell.trim() !== "")) rows.push(row);
      row = [];
      continue;
    }

    value += char;
  }

  if (value.length || row.length) {
    row.push(value);
    if (row.some((cell) => cell.trim() !== "")) rows.push(row);
  }

  if (!rows.length) return [];
  const headers = rows[0].map((header) => header.trim());
  return rows.slice(1).map((cells, rowIndex) => {
    const record = { __row: rowIndex + 2 };
    headers.forEach((header, columnIndex) => {
      record[header] = (cells[columnIndex] ?? "").trim();
    });
    return record;
  });
}

export function normalizeName(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/[’`]/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("uk-UA");
}

export function normalizeBoolean(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  return ["1", "true", "yes", "y", "да", "так"].includes(normalized);
}

export function normalizePlayerStatus(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (["inactive", "неактивный", "неактивний", "archived"].includes(normalized)) {
    return "inactive";
  }
  return "active";
}

export function normalizePhone(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return { value: "", valid: false, reason: "missing" };

  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.length === 10 && digits.startsWith("0")) digits = `38${digits}`;
  if (digits.length === 12 && digits.startsWith("380")) {
    return { value: `+${digits}`, valid: true, reason: null };
  }
  return { value: raw, valid: false, reason: "expected_ukraine_e164" };
}

export function maskPhone(phone) {
  const normalized = normalizePhone(phone).value;
  if (!normalized.startsWith("+380") || normalized.length < 8) return "invalid";
  return `${normalized.slice(0, 6)}•••${normalized.slice(-3)}`;
}

export function csvEscape(value, delimiter = ";") {
  const text = value == null ? "" : String(value);
  if (text.includes(delimiter) || text.includes('"') || /[\r\n]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

export function writeCsv(filePath, headers, records) {
  const delimiter = ";";
  const lines = [headers.map((header) => csvEscape(header, delimiter)).join(delimiter)];
  for (const record of records) {
    lines.push(headers.map((header) => csvEscape(record[header], delimiter)).join(delimiter));
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`, "utf8");
}
