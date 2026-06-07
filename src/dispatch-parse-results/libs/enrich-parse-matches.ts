/**
 * Optional post-parse enrichment: extend redirect chains past tracker hops and attach
 * `tagMatchedInChain`, `destinationHost`, `destinationUrl` to slim matches.
 *
 * Disable globally: `DISPATCH_PARSER_ENRICH_MATCH_DESTINATIONS=false`
 * Or comment out the `maybeEnrichParseMatches` call in `dispatch-parse-results.service.ts`.
 */
import { continueResolvePastTracker } from '../../offers/libs/continue-resolve-past-tracker';
import { findFirstUrlPatternMatchInChain } from '../../offers/libs/match-url-patterns';
import { resolveShortLinkChain } from '../../offers/libs/resolve-short-link-chain';
import { isShortLink } from '../../offers/libs/is-short-link';
import type {
  TAnalyzeArtifactOutput,
  TMatchedResolvedOffer,
  TRedirectHop,
  TOfferLink,
} from '../../offers/types';
import { isTrackerOrShortHost } from './is-tracker-or-short-host';
import { pickDestinationFromChain } from './pick-destination-from-chain';
import { DispatchParseResultMatchType } from '../schemas/dispatch-parse-result.schema';
import type { TSlimParseResultMatch, TSlimParseResultPayload } from './slim-parse-result';

export type TEnrichParseMatchesOptions = {
  patterns: string[];
  analysis: TAnalyzeArtifactOutput;
  requestHeaders?: Record<string, string>;
  timeoutMs?: number;
  concurrency?: number;
};

export type TEnrichmentFields = {
  tagMatchedInChain: boolean;
  destinationHost?: string;
  destinationUrl?: string;
};

type TResolvedOfferLookup = Map<string, TMatchedResolvedOffer>;

function buildResolvedOfferLookup(
  analysis: TAnalyzeArtifactOutput,
): TResolvedOfferLookup {
  return new Map(analysis.resolvedMatches.map((offer) => [offer.href, offer]));
}

async function extendChainFromLastHop(
  chain: TRedirectHop[],
  patterns: string[],
  options: TEnrichParseMatchesOptions,
): Promise<TRedirectHop[]> {
  if (chain.length === 0) {
    return chain;
  }

  const lastHop = chain[chain.length - 1];
  if (!lastHop?.url || !isTrackerOrShortHost(lastHop.url, patterns)) {
    return chain;
  }

  const extraHops = await continueResolvePastTracker(lastHop.url, {
    timeoutMs: options.timeoutMs,
    requestHeaders: options.requestHeaders,
  });

  if (extraHops.length === 0) {
    return chain;
  }

  return [...chain, ...extraHops];
}

async function buildChainForDirectOffer(
  offer: TOfferLink,
  patterns: string[],
  options: TEnrichParseMatchesOptions,
): Promise<TRedirectHop[]> {
  if (!isShortLink(offer.href)) {
    return [{ url: offer.href, statusCode: 0 }];
  }

  const resolved = await resolveShortLinkChain(
    offer.href,
    options.timeoutMs ?? 12_000,
    options.requestHeaders,
  );

  const baseChain =
    resolved.chain.length > 0
      ? resolved.chain
      : [{ url: offer.href, statusCode: resolved.statusCode || 0 }];

  return extendChainFromLastHop(baseChain, patterns, options);
}

async function buildChainForResolvedOffer(
  offer: TMatchedResolvedOffer,
  patterns: string[],
  options: TEnrichParseMatchesOptions,
): Promise<TRedirectHop[]> {
  const baseChain =
    offer.chain && offer.chain.length > 0
      ? offer.chain
      : [{ url: offer.finalUrl || offer.href, statusCode: offer.statusCode || 0 }];

  return extendChainFromLastHop(baseChain, patterns, options);
}

function hasTagHopInChain(
  chain: TRedirectHop[],
  patterns: string[],
): boolean {
  return findFirstUrlPatternMatchInChain(chain, patterns) !== null;
}

async function enrichSingleMatch(
  match: TSlimParseResultMatch,
  options: TEnrichParseMatchesOptions,
  resolvedByHref: TResolvedOfferLookup,
  chainCache: Map<string, TRedirectHop[]>,
): Promise<TSlimParseResultMatch> {
  const cacheKey = `${match.matchType}|${match.href}`;
  let chain = chainCache.get(cacheKey);

  if (!chain) {
    if (match.matchType === DispatchParseResultMatchType.RESOLVED) {
      const resolvedOffer = resolvedByHref.get(match.href);
      chain = resolvedOffer
        ? await buildChainForResolvedOffer(resolvedOffer, options.patterns, options)
        : [{ url: match.finalUrl ?? match.href, statusCode: 0 }];
    } else {
      chain = await buildChainForDirectOffer(
        {
          href: match.href,
          anchorText: match.anchorText,
          blockName: match.blockName,
          blockSelector: match.blockSelector,
          positionOnPage: match.positionOnPage,
          positionInBlock: match.positionInBlock,
        },
        options.patterns,
        options,
      );
    }
    chainCache.set(cacheKey, chain);
  }

  const tagMatchedInChain = hasTagHopInChain(chain, options.patterns);
  const destination = pickDestinationFromChain(chain, options.patterns);

  return {
    ...match,
    tagMatchedInChain,
    ...destination,
  };
}

export async function enrichParseMatches(
  payload: TSlimParseResultPayload,
  options: TEnrichParseMatchesOptions,
): Promise<TSlimParseResultPayload> {
  if (payload.matches.length === 0) {
    return payload;
  }

  const resolvedByHref = buildResolvedOfferLookup(options.analysis);
  const chainCache = new Map<string, TRedirectHop[]>();
  const concurrency = Math.max(1, options.concurrency ?? 4);
  const enrichedMatches: TSlimParseResultMatch[] = new Array(payload.matches.length);
  let cursor = 0;

  const worker = async () => {
    while (cursor < payload.matches.length) {
      const index = cursor;
      cursor += 1;
      const match = payload.matches[index];
      if (!match) {
        continue;
      }
      enrichedMatches[index] = await enrichSingleMatch(
        match,
        options,
        resolvedByHref,
        chainCache,
      );
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(concurrency, payload.matches.length) }, () =>
      worker(),
    ),
  );

  return {
    ...payload,
    matches: enrichedMatches,
  };
}

export type TMaybeEnrichParseMatchesInput = TEnrichParseMatchesOptions & {
  enabled: boolean;
};

/** Single hook: no-op when `enabled` is false. */
export async function maybeEnrichParseMatches(
  payload: TSlimParseResultPayload,
  input: TMaybeEnrichParseMatchesInput,
): Promise<TSlimParseResultPayload> {
  if (!input.enabled) {
    return payload;
  }

  return enrichParseMatches(payload, input);
}
