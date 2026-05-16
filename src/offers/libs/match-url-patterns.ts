import { matchesAnyPattern, normalizePatterns } from './find-links-by-pattern';

export type TUrlPatternMatch = {
  hopIndex: number;
  matchedUrl: string;
};

/** Collects lowercase fragments from URL host, path, and query keys/values. */
export function collectUrlMatchHaystacks(url: string): string[] {
  try {
    const parsed = new URL(url);
    const haystacks = [
      parsed.hostname.toLowerCase(),
      parsed.pathname.toLowerCase(),
      parsed.search.toLowerCase(),
    ];

    for (const [key, value] of parsed.searchParams.entries()) {
      haystacks.push(key.toLowerCase());
      haystacks.push(value.toLowerCase());
    }

    return haystacks;
  } catch {
    return [url.toLowerCase()];
  }
}

/** True if any pattern appears in host, path, or query parameter names/values. */
export function urlMatchesPatterns(url: string, patterns: string[]): boolean {
  const normalized = normalizePatterns(patterns);
  if (normalized.length === 0) {
    return false;
  }

  const haystacks = collectUrlMatchHaystacks(url);
  return normalized.some((pattern) =>
    haystacks.some((fragment) => fragment.includes(pattern)),
  );
}

export function findFirstUrlPatternMatchInChain(
  chain: Array<{ url: string }>,
  patterns: string[],
): TUrlPatternMatch | null {
  for (let hopIndex = 0; hopIndex < chain.length; hopIndex += 1) {
    const hopUrl = chain[hopIndex]?.url;
    if (!hopUrl) continue;
    if (urlMatchesPatterns(hopUrl, patterns)) {
      return { hopIndex, matchedUrl: hopUrl };
    }
  }
  return null;
}

/** Fallback for non-URL strings (same as legacy direct href matching). */
export function legacyUrlMatchesPatterns(
  value: string,
  patterns: string[],
): boolean {
  if (urlMatchesPatterns(value, patterns)) {
    return true;
  }
  return matchesAnyPattern(value, patterns);
}
