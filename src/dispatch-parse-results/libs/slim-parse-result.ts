import { normalizePatterns } from '../../offers/libs/find-links-by-pattern';
import { collectUrlMatchHaystacks } from '../../offers/libs/match-url-patterns';
import type { TAnalyzeArtifactOutput } from '../../offers/types';
import { DispatchParseResultMatchType } from '../schemas/dispatch-parse-result.schema';

export type TSlimParseResultMatch = {
  matchType: DispatchParseResultMatchType;
  pattern: string;
  href: string;
  anchorText: string;
  blockName: string;
  blockSelector: string;
  positionOnPage: number;
  positionInBlock: number;
  finalUrl?: string;
  tagMatchedInChain?: boolean;
  destinationHost?: string;
  destinationUrl?: string;
};

export type TSlimParseResultPayload = {
  queueItemId: string;
  userId: string;
  checklistId: string;
  scheduleId?: string;
  url: string;
  analyzedAt: Date;
  patterns: string[];
  matches: TSlimParseResultMatch[];
};

export function findFirstDirectPattern(
  href: string,
  patterns: string[],
): string | undefined {
  const normalized = normalizePatterns(patterns);
  const lowered = href.toLowerCase();
  return normalized.find((pattern) => lowered.includes(pattern));
}

export function findFirstUrlPattern(
  url: string,
  patterns: string[],
): string | undefined {
  const normalized = normalizePatterns(patterns);
  if (normalized.length === 0) {
    return undefined;
  }

  const haystacks = collectUrlMatchHaystacks(url);
  return normalized.find((pattern) =>
    haystacks.some((fragment) => fragment.includes(pattern)),
  );
}

export function buildSlimParseResult(input: {
  queueItemId: string;
  userId: string;
  checklistId: string;
  scheduleId?: string;
  url: string;
  analyzedAt: Date;
  patterns: string[];
  analysis: TAnalyzeArtifactOutput;
}): TSlimParseResultPayload {
  const patterns = input.patterns;
  const matches: TSlimParseResultMatch[] = [];

  for (const offer of input.analysis.directMatches) {
    const pattern = findFirstDirectPattern(offer.href, patterns);
    if (!pattern) {
      continue;
    }
    matches.push({
      matchType: DispatchParseResultMatchType.DIRECT,
      pattern,
      href: offer.href,
      anchorText: offer.anchorText,
      blockName: offer.blockName,
      blockSelector: offer.blockSelector,
      positionOnPage: offer.positionOnPage,
      positionInBlock: offer.positionInBlock,
    });
  }

  for (const offer of input.analysis.resolvedMatches) {
    const urlForPattern = offer.matchedUrl ?? offer.finalUrl;
    const pattern = findFirstUrlPattern(urlForPattern, patterns);
    if (!pattern) {
      continue;
    }
    matches.push({
      matchType: DispatchParseResultMatchType.RESOLVED,
      pattern,
      href: offer.href,
      anchorText: offer.anchorText,
      blockName: offer.blockName,
      blockSelector: offer.blockSelector,
      positionOnPage: offer.positionOnPage,
      positionInBlock: offer.positionInBlock,
      finalUrl: offer.finalUrl,
    });
  }

  return {
    queueItemId: input.queueItemId,
    userId: input.userId,
    checklistId: input.checklistId,
    scheduleId: input.scheduleId,
    url: input.url,
    analyzedAt: input.analyzedAt,
    patterns,
    matches,
  };
}
