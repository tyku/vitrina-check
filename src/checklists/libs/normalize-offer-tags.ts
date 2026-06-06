export const MAX_OFFER_TAGS_PER_CHECKLIST = 20;
export const MAX_OFFER_TAG_LENGTH = 64;

const OFFER_TAG_REGEX = /^[a-z0-9][a-z0-9._-]*$/;

export type TNormalizeOfferTagsResult =
  | { ok: true; tags: string[] }
  | { ok: false; error: string };

export function normalizeOfferTagValue(raw: string): string | null {
  const value = raw.trim().toLowerCase();
  if (!value) {
    return null;
  }
  if (value.length > MAX_OFFER_TAG_LENGTH) {
    return null;
  }
  if (!OFFER_TAG_REGEX.test(value)) {
    return null;
  }
  return value;
}

export function normalizeOfferTags(input: string[]): TNormalizeOfferTagsResult {
  const normalized: string[] = [];
  const seen = new Set<string>();

  for (const raw of input) {
    const value = normalizeOfferTagValue(raw);
    if (!value) {
      return {
        ok: false,
        error:
          'Метка: латиница/цифры, можно . _ -, до 64 символов, начинается с буквы или цифры.',
      };
    }
    if (seen.has(value)) {
      continue;
    }
    seen.add(value);
    normalized.push(value);
    if (normalized.length > MAX_OFFER_TAGS_PER_CHECKLIST) {
      return {
        ok: false,
        error: `Не больше ${MAX_OFFER_TAGS_PER_CHECKLIST} меток.`,
      };
    }
  }

  return { ok: true, tags: normalized };
}

export function parseOfferTagsFromText(text: string): string[] {
  return text
    .split(/[\n,;]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}
