export type OfferLink = {
  href: string;
  anchorText: string;
  blockName: string;
  blockSelector: string;
  positionInBlock: number;
  positionOnPage: number;
};

export type FetchHtmlOptions = {
  timeoutMs?: number;
  viewport?: {
    width: number;
    height: number;
  };
  userAgent?: string;
};

export type FetchHtmlResult = {
  url: string;
  html: string;
};

export type ResolveShortLinksOptions = {
  patterns: string[];
  timeoutMs?: number;
  concurrency?: number;
};

export type ResolvedShortLink = {
  sourceUrl: string;
  finalUrl: string;
  statusCode: number;
  error: string;
};

export type MatchedResolvedOffer = OfferLink & {
  finalUrl: string;
  statusCode: number;
};
