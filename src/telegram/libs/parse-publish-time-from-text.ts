const PUBLISH_TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** Parses HH:MM from user text (optional leading/trailing spaces). */
export function parsePublishTimeFromText(text: string): string | null {
  const trimmed = text.trim();
  const match = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) {
    return null;
  }

  const hours = match[1].padStart(2, '0');
  const minutes = match[2];
  const candidate = `${hours}:${minutes}`;
  return PUBLISH_TIME_REGEX.test(candidate) ? candidate : null;
}
