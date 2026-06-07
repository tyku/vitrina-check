import type { DispatchParseResultMatchType } from '../schemas/dispatch-parse-result.schema';

export type TResponseDispatchParseResultMatchDto = {
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

export type TResponseDispatchParseResultDto = {
  queueItemId: string;
  checklistId: string;
  scheduleId?: string;
  url: string;
  analyzedAt: Date;
  patterns: string[];
  matches: TResponseDispatchParseResultMatchDto[];
};
