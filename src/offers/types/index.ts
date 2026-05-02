export type TOfferLink = {
  href: string;
  anchorText: string;
  blockName: string;
  blockSelector: string;
  positionInBlock: number;
  positionOnPage: number;
};

export type TFetchHtmlOptions = {
  timeoutMs?: number;
  viewport?: {
    width: number;
    height: number;
  };
  userAgent?: string;
};

export type TFetchHtmlResult = {
  url: string;
  html: string;
};

export type TResolveShortLinksOptions = {
  patterns: string[];
  timeoutMs?: number;
  concurrency?: number;
  /** Merged into fetch headers (e.g. User-Agent aligned with Playwright capture). */
  requestHeaders?: Record<string, string>;
};

export type TResolvedShortLink = {
  sourceUrl: string;
  finalUrl: string;
  statusCode: number;
  error: string;
};

export type TMatchedResolvedOffer = TOfferLink & {
  finalUrl: string;
  statusCode: number;
};

export type TAnalyzeArtifactInput = {
  artifactHtmlPath: string;
  patterns: string[];
  resolveShortLinks?: boolean;
  shortLinkTimeoutMs?: number;
  shortLinkConcurrency?: number;
  shortLinkRequestHeaders?: Record<string, string>;
};

export type TAnalyzeArtifactOutput = {
  artifactHtmlPath: string;
  patterns: string[];
  totalOffers: number;
  directMatches: TOfferLink[];
  resolvedMatches: TMatchedResolvedOffer[];
  /** Present when `resolveShortLinks` was true: one row per unique short URL after HTTP redirect follow. */
  shortLinkResolutions?: TResolvedShortLink[];
};
