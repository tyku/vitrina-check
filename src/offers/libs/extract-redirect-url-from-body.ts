function resolveMaybeRelativeUrl(
  candidate: string,
  baseUrl: string,
): string | null {
  try {
    return new URL(candidate.trim(), baseUrl).href;
  } catch {
    return null;
  }
}

function decodeHtmlEntityUrl(value: string): string {
  return value
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

const REDIRECT_BODY_PATTERNS: Array<(body: string, baseUrl: string) => string | null> =
  [
    (body, baseUrl) => {
      const match = body.match(
        /http-equiv=["']refresh["'][^>]*content=["'][^"']*url=([^"'>;\s]+)/i,
      );
      return match?.[1]
        ? resolveMaybeRelativeUrl(decodeHtmlEntityUrl(match[1]), baseUrl)
        : null;
    },
    (body, baseUrl) => {
      const match = body.match(
        /window\.location(?:\.href)?\s*=\s*["']([^"']+)["']/i,
      );
      return match?.[1]
        ? resolveMaybeRelativeUrl(decodeHtmlEntityUrl(match[1]), baseUrl)
        : null;
    },
    (body, baseUrl) => {
      const match = body.match(/location\.replace\(\s*["']([^"']+)["']\s*\)/i);
      return match?.[1]
        ? resolveMaybeRelativeUrl(decodeHtmlEntityUrl(match[1]), baseUrl)
        : null;
    },
    (body, baseUrl) => {
      const match = body.match(
        /"(?:redirect(?:Url|URL|_url)?|destination(?:Url|URL)?|targetUrl|nextUrl|url)"\s*:\s*"([^"]+)"/i,
      );
      return match?.[1]
        ? resolveMaybeRelativeUrl(decodeHtmlEntityUrl(match[1]), baseUrl)
        : null;
    },
  ];

/** Best-effort redirect target from HTML/JSON tracker response bodies. */
export function extractRedirectUrlFromBody(
  body: string,
  baseUrl: string,
): string | null {
  const trimmed = body.trim();
  if (!trimmed) {
    return null;
  }

  for (const extract of REDIRECT_BODY_PATTERNS) {
    const resolved = extract(trimmed, baseUrl);
    if (resolved) {
      return resolved;
    }
  }

  return null;
}
