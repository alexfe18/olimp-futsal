const END_OF_CENTRAL_DIRECTORY_SIGNATURE = 0x06054b50;
const CENTRAL_DIRECTORY_SIGNATURE = 0x02014b50;
const LOCAL_FILE_HEADER_SIGNATURE = 0x04034b50;

const MAX_ZIP_ENTRIES = 200;
const MAX_TOTAL_UNCOMPRESSED_BYTES = 200 * 1024 * 1024;

export type ExtractedZipEntry = {
  path: string;
  bytes: Uint8Array;
};

function findEndOfCentralDirectory(bytes: Uint8Array) {
  const minimumOffset = Math.max(0, bytes.length - 65_557);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  for (let offset = bytes.length - 22; offset >= minimumOffset; offset -= 1) {
    if (view.getUint32(offset, true) === END_OF_CENTRAL_DIRECTORY_SIGNATURE) {
      return offset;
    }
  }

  return -1;
}

function decodeFileName(bytes: Uint8Array) {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder().decode(bytes);
  }
}

function toStandaloneArrayBuffer(bytes: Uint8Array) {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

async function inflateRaw(bytes: Uint8Array) {
  if (typeof DecompressionStream === "undefined") {
    throw new Error(
      "Цей браузер не підтримує розпакування ZIP. Спробуйте завантажити окремі зображення.",
    );
  }

  const stream = new Blob([toStandaloneArrayBuffer(bytes)])
    .stream()
    .pipeThrough(new DecompressionStream("deflate-raw"));

  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export async function extractStandardZip(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const endOffset = findEndOfCentralDirectory(bytes);

  if (endOffset < 0) {
    throw new Error("Не вдалося знайти центральний каталог ZIP-архіву.");
  }

  const diskNumber = view.getUint16(endOffset + 4, true);
  const centralDirectoryDisk = view.getUint16(endOffset + 6, true);
  const entriesOnDisk = view.getUint16(endOffset + 8, true);
  const totalEntries = view.getUint16(endOffset + 10, true);
  const centralDirectoryOffset = view.getUint32(endOffset + 16, true);

  if (diskNumber !== 0 || centralDirectoryDisk !== 0 || entriesOnDisk !== totalEntries) {
    throw new Error("Багатотомні ZIP-архіви не підтримуються.");
  }

  if (totalEntries > MAX_ZIP_ENTRIES) {
    throw new Error(`ZIP містить понад ${MAX_ZIP_ENTRIES} файлів.`);
  }

  if (centralDirectoryOffset === 0xffffffff || totalEntries === 0xffff) {
    throw new Error("ZIP64 поки не підтримується.");
  }

  const entries: ExtractedZipEntry[] = [];
  let cursor = centralDirectoryOffset;
  let totalUncompressedBytes = 0;

  for (let index = 0; index < totalEntries; index += 1) {
    if (cursor + 46 > bytes.length) {
      throw new Error("ZIP-архів пошкоджений: неповний запис каталогу.");
    }

    if (view.getUint32(cursor, true) !== CENTRAL_DIRECTORY_SIGNATURE) {
      throw new Error("ZIP-архів пошкоджений: невірний запис каталогу.");
    }

    const flags = view.getUint16(cursor + 8, true);
    const compressionMethod = view.getUint16(cursor + 10, true);
    const compressedSize = view.getUint32(cursor + 20, true);
    const uncompressedSize = view.getUint32(cursor + 24, true);
    const fileNameLength = view.getUint16(cursor + 28, true);
    const extraLength = view.getUint16(cursor + 30, true);
    const commentLength = view.getUint16(cursor + 32, true);
    const localHeaderOffset = view.getUint32(cursor + 42, true);

    if (
      compressedSize === 0xffffffff ||
      uncompressedSize === 0xffffffff ||
      localHeaderOffset === 0xffffffff
    ) {
      throw new Error("ZIP64 поки не підтримується.");
    }

    const fileNameStart = cursor + 46;
    const fileNameEnd = fileNameStart + fileNameLength;

    if (fileNameEnd > bytes.length) {
      throw new Error("ZIP-архів пошкоджений: неповна назва файла.");
    }

    const path = decodeFileName(bytes.subarray(fileNameStart, fileNameEnd));
    cursor = fileNameEnd + extraLength + commentLength;

    if (flags & 0x1) {
      throw new Error(`Зашифрований файл «${path}» не підтримується.`);
    }

    if (path.endsWith("/")) continue;

    if (localHeaderOffset + 30 > bytes.length) {
      throw new Error(`ZIP-архів пошкоджений біля файла «${path}».`);
    }

    if (view.getUint32(localHeaderOffset, true) !== LOCAL_FILE_HEADER_SIGNATURE) {
      throw new Error(`Не вдалося прочитати файл «${path}» із ZIP.`);
    }

    const localFileNameLength = view.getUint16(localHeaderOffset + 26, true);
    const localExtraLength = view.getUint16(localHeaderOffset + 28, true);
    const dataStart = localHeaderOffset + 30 + localFileNameLength + localExtraLength;
    const dataEnd = dataStart + compressedSize;

    if (dataEnd > bytes.length) {
      throw new Error(`ZIP-архів пошкоджений: неповні дані файла «${path}».`);
    }

    totalUncompressedBytes += uncompressedSize;
    if (totalUncompressedBytes > MAX_TOTAL_UNCOMPRESSED_BYTES) {
      throw new Error("Загальний розпакований розмір ZIP перевищує 200 МБ.");
    }

    const compressedBytes = bytes.subarray(dataStart, dataEnd);
    let output: Uint8Array;

    if (compressionMethod === 0) {
      output = new Uint8Array(compressedBytes);
    } else if (compressionMethod === 8) {
      output = await inflateRaw(compressedBytes);
    } else {
      throw new Error(
        `Файл «${path}» використовує непідтримуваний метод стиснення (${compressionMethod}).`,
      );
    }

    if (output.byteLength !== uncompressedSize) {
      throw new Error(`Розмір файла «${path}» після розпакування не збігається.`);
    }

    entries.push({ path, bytes: output });
  }

  return entries;
}
