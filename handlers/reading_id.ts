import {readFileSync} from "fs";
import {join} from "path";

const READING_ID_TEXT_PATH = "webui/data/reading_id_text.json";
const RESOURCE_DIR = join(__dirname, "..", "webui", "data");

type ReadingIdText = Record<string, string>;

let readingIdTextCache: ReadingIdText | null = null;

export const normalizeReadingId = (readingId: string) => {
  const value = String(readingId || "")
    .trim()
    .toLowerCase()
    .replace(/^0x/, "");
  return `0x${value}`;
};

export const loadReadingIdText = async (): Promise<ReadingIdText> => {
  if (readingIdTextCache) {
    return readingIdTextCache;
  }

  const parsed = JSON.parse(readFileSync(join(RESOURCE_DIR, "reading_id_text.json"), "utf8"));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`${READING_ID_TEXT_PATH} must contain an object`);
  }

  readingIdTextCache = parsed as ReadingIdText;
  return readingIdTextCache;
};

export const validateReadingId = async (readingId: string) => {
  const normalizedId = normalizeReadingId(readingId);
  const idWithoutPrefix = normalizedId.slice(2);
  const readingIdText = await loadReadingIdText();

  if (
    !idWithoutPrefix ||
    !/^[0-9a-f]+$/.test(idWithoutPrefix) ||
    !Object.prototype.hasOwnProperty.call(readingIdText, normalizedId)
  ) {
    throw new Error(`Reading ID ${readingId} is not present in reading_id_text.json`);
  }

  return idWithoutPrefix;
};
