import { normalizePatterns } from '../../offers/libs/find-links-by-pattern';

const INTERMEDIATE_REDIRECT_HOSTS = new Set([
  'bit.ly',
  't.co',
  'tinyurl.com',
  'cutt.ly',
  'clck.ru',
  'goo.su',
  'sovtrk.com',
  'sovtrk.ru',
  'startracker.ru',
]);

export function hostnameFromUrl(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/** Hostname contains any checklist tag pattern (tracker networks). */
export function hostnameMatchesTagPatterns(
  hostname: string,
  patterns: string[],
): boolean {
  const normalized = normalizePatterns(patterns);
  const lowered = hostname.toLowerCase();
  return normalized.some((pattern) => lowered.includes(pattern));
}

export function isIntermediateRedirectHost(hostname: string): boolean {
  const lowered = hostname.toLowerCase();
  return (
    INTERMEDIATE_REDIRECT_HOSTS.has(lowered) ||
    INTERMEDIATE_REDIRECT_HOSTS.has(lowered.replace(/^www\./, ''))
  );
}

export function isTrackerOrShortHost(
  url: string,
  patterns: string[],
): boolean {
  const hostname = hostnameFromUrl(url);
  if (!hostname) {
    return false;
  }
  return (
    isIntermediateRedirectHost(hostname) ||
    hostnameMatchesTagPatterns(hostname, patterns)
  );
}
