import type { TOfferLink } from '../types';

export function normalizePatterns(patterns: string[]): string[] {
  return patterns
    .map((pattern) => pattern.trim().toLowerCase())
    .filter(Boolean);
}

export function matchesAnyPattern(value: string, patterns: string[]): boolean {
  const normalized = normalizePatterns(patterns);
  const lowered = value.toLowerCase();
  return normalized.some((pattern) => lowered.includes(pattern));
}

export function findLinksByPattern(
  offers: TOfferLink[],
  patterns: string[],
): TOfferLink[] {
  return offers.filter((offer) => matchesAnyPattern(offer.href, patterns));
}
