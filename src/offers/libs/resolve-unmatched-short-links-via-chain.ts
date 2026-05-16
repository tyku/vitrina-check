import {
  TMatchedResolvedOffer,
  TOfferLink,
  TResolvedShortLinkWithChain,
  TResolveShortLinksOptions,
} from '../types';

import { findLinksByPattern, normalizePatterns } from './find-links-by-pattern';
import { isShortLink } from './is-short-link';
import { findFirstUrlPatternMatchInChain } from './match-url-patterns';
import { resolveShortLinkChain } from './resolve-short-link-chain';
import {
  DEFAULT_SHORT_LINK_MAX_HOPS,
  mapUniqueUrlsWithConcurrency,
} from './short-link-resolver.shared';

export async function resolveUnmatchedShortLinksViaChain(
  offers: TOfferLink[],
  options: TResolveShortLinksOptions,
): Promise<{
  directMatches: TOfferLink[];
  resolvedMatches: TResolvedShortLinkWithChain[];
  resolvedMatchedOffers: TMatchedResolvedOffer[];
  allResolved: TResolvedShortLinkWithChain[];
}> {
  const patterns = normalizePatterns(options.patterns);
  const timeoutMs = options.timeoutMs ?? 12_000;
  const concurrency = options.concurrency ?? 8;
  const maxHops = options.maxHops ?? DEFAULT_SHORT_LINK_MAX_HOPS;

  const directMatches = findLinksByPattern(offers, patterns);
  const directUrlSet = new Set(directMatches.map((offer) => offer.href));

  const unresolvedShortLinks = offers
    .map((offer) => offer.href)
    .filter((href) => !directUrlSet.has(href))
    .filter((href) => isShortLink(href));

  const allResolved = await mapUniqueUrlsWithConcurrency(
    unresolvedShortLinks,
    concurrency,
    (url) =>
      resolveShortLinkChain(
        url,
        timeoutMs,
        options.requestHeaders,
        maxHops,
      ),
  );

  const resolvedWithMatch = allResolved.map((item) => {
    const patternMatch = findFirstUrlPatternMatchInChain(item.chain, patterns);
    return { item, patternMatch };
  });

  const resolvedMatches = resolvedWithMatch
    .filter(({ patternMatch }) => patternMatch !== null)
    .map(({ item, patternMatch }) => ({
      ...item,
      matchedUrl: patternMatch?.matchedUrl,
      matchedHopIndex: patternMatch?.hopIndex,
    }));

  const matchedBySource = new Map(
    resolvedMatches.map((item) => [item.sourceUrl, item]),
  );

  const resolvedMatchedOffers: TMatchedResolvedOffer[] = offers
    .filter((offer) => matchedBySource.has(offer.href))
    .map((offer) => {
      const resolution = matchedBySource.get(offer.href);
      return {
        ...offer,
        finalUrl: resolution?.finalUrl || '',
        statusCode: resolution?.statusCode || 0,
        matchedUrl: resolution?.matchedUrl,
        matchedHopIndex: resolution?.matchedHopIndex,
        chain: resolution?.chain,
      };
    });

  return {
    directMatches,
    resolvedMatches,
    resolvedMatchedOffers,
    allResolved: resolvedWithMatch.map(({ item, patternMatch }) => ({
      ...item,
      matchedUrl: patternMatch?.matchedUrl,
      matchedHopIndex: patternMatch?.hopIndex,
    })),
  };
}
