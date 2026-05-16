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

export type TShortLinkResolveMode = 'final' | 'chain';

export type TResolveShortLinksOptions = {
  patterns: string[];
  timeoutMs?: number;
  concurrency?: number;
  maxHops?: number;
  /** Merged into fetch headers (e.g. User-Agent aligned with Playwright capture). */
  requestHeaders?: Record<string, string>;
};

export type TRedirectHop = {
  url: string;
  statusCode: number;
};

export type TResolvedShortLink = {
  sourceUrl: string;
  finalUrl: string;
  statusCode: number;
  error: string;
};

export type TResolvedShortLinkWithChain = TResolvedShortLink & {
  chain: TRedirectHop[];
  matchedUrl?: string;
  matchedHopIndex?: number;
};

export type TMatchedResolvedOffer = TOfferLink & {
  finalUrl: string;
  statusCode: number;
  matchedUrl?: string;
  matchedHopIndex?: number;
  chain?: TRedirectHop[];
};

export type TAnalyzeArtifactInput = {
  artifactHtmlPath: string;
  patterns: string[];
  resolveShortLinks?: boolean;
  /** `final` — match patterns on terminal URL only; `chain` — any redirect hop (incl. final). */
  shortLinkResolveMode?: TShortLinkResolveMode;
  shortLinkTimeoutMs?: number;
  shortLinkConcurrency?: number;
  shortLinkMaxHops?: number;
  shortLinkRequestHeaders?: Record<string, string>;
};

export type TAnalyzeArtifactOutput = {
  artifactHtmlPath: string;
  patterns: string[];
  shortLinkResolveMode?: TShortLinkResolveMode;
  totalOffers: number;
  directMatches: TOfferLink[];
  resolvedMatches: TMatchedResolvedOffer[];
  /** Present when `resolveShortLinks` was true: one row per unique short URL resolved. */
  shortLinkResolutions?: Array<TResolvedShortLink | TResolvedShortLinkWithChain>;
};
