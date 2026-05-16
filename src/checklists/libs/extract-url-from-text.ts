const URL_IN_TEXT_REGEX = /https?:\/\/[^\s<>"']+/i;

export function extractUrlFromText(text: string): string | null {
  const match = text.trim().match(URL_IN_TEXT_REGEX);
  if (!match?.[0]) {
    return null;
  }
  return match[0].replace(/[.,;:!?)]+$/, '');
}
