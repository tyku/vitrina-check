import {
   TMatchedResolvedOffer,
   TOfferLink,
   TResolvedShortLink,
   TResolveShortLinksOptions,
} from '../types';

import { 
  findLinksByPattern,
  matchesAnyPattern,
  normalizePatterns,
 } from './find-links-by-pattern';
import { isShortLink } from './is-short-link';

async function resolveOneShortLink(sourceUrl: string, timeoutMs: number): Promise<TResolvedShortLink> {
  const requestUrl = sourceUrl.includes('?') ? `${sourceUrl}&nc=1` : `${sourceUrl}?nc=1`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(requestUrl, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'user-agent': 'Mozilla/5.0 (X11; Linux x86_64)',
      },
    });

    return {
      sourceUrl,
      finalUrl: response.url,
      statusCode: response.status,
      error: '',
    };
  } catch (error) {
    return {
      sourceUrl,
      finalUrl: '',
      statusCode: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timer);
  }
}

async function resolveUniqueShortLinks(
  urls: string[],
  concurrency: number,
  timeoutMs: number,
): Promise<TResolvedShortLink[]> {
  const queue = [...new Set(urls)];
  const results: TResolvedShortLink[] = [];

  const worker = async () => {
    while (queue.length > 0) {
      const url = queue.shift();
      if (!url) continue;
      const resolved = await resolveOneShortLink(url, timeoutMs);
      results.push(resolved);
    }
  };

  await Promise.all(Array.from({ length: Math.max(1, concurrency) }, () => worker()));
  return results;
}

export async function resolveUnmatchedShortLinks(
  offers: TOfferLink[],
  options: TResolveShortLinksOptions,
): Promise<{
  directMatches: TOfferLink[];
  resolvedMatches: TResolvedShortLink[];
  resolvedMatchedOffers: TMatchedResolvedOffer[];
}> {
  const patterns = normalizePatterns(options.patterns);
  const timeoutMs = options.timeoutMs ?? 12_000;
  const concurrency = options.concurrency ?? 8;

  const directMatches = findLinksByPattern(offers, patterns);
  const directUrlSet = new Set(directMatches.map((offer) => offer.href));

  const unresolvedShortLinks = offers
    .map((offer) => offer.href)
    .filter((href) => !directUrlSet.has(href))
    .filter((href) => isShortLink(href));

  const resolved = await resolveUniqueShortLinks(unresolvedShortLinks, concurrency, timeoutMs);
  const resolvedMatches = resolved.filter((item) => matchesAnyPattern(item.finalUrl, patterns));
  const matchedBySource = new Map(resolvedMatches.map((item) => [item.sourceUrl, item]));

  const resolvedMatchedOffers: TMatchedResolvedOffer[] = offers
    .filter((offer) => matchedBySource.has(offer.href))
    .map((offer) => {
      const resolution = matchedBySource.get(offer.href);
      return {
        ...offer,
        finalUrl: resolution?.finalUrl || '',
        statusCode: resolution?.statusCode || 0,
      };
    });

  return {
    directMatches,
    resolvedMatches,
    resolvedMatchedOffers,
  };
}
