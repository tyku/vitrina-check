import type { TRedirectHop } from '../types';
import { extractRedirectUrlFromBody } from './extract-redirect-url-from-body';
import {
  buildShortLinkResolverHeaders,
  DEFAULT_SHORT_LINK_MAX_HOPS,
} from './short-link-resolver.shared';

function resolveRedirectLocation(
  location: string,
  currentUrl: string,
): string | null {
  try {
    return new URL(location, currentUrl).href;
  } catch {
    return null;
  }
}

async function readResponseBodyText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return '';
  }
}

export type TContinueResolvePastTrackerOptions = {
  timeoutMs?: number;
  maxHops?: number;
  requestHeaders?: Record<string, string>;
};

/**
 * Follows redirects starting at a tracker/intermediate URL (often HTTP 200 + body redirect).
 * Returns hops **after** `startUrl` (does not repeat the start URL in the result).
 */
export async function continueResolvePastTracker(
  startUrl: string,
  options: TContinueResolvePastTrackerOptions = {},
): Promise<TRedirectHop[]> {
  const timeoutMs = options.timeoutMs ?? 12_000;
  const maxHops = options.maxHops ?? DEFAULT_SHORT_LINK_MAX_HOPS;
  const headers = buildShortLinkResolverHeaders(options.requestHeaders);
  const additionalHops: TRedirectHop[] = [];
  const deadline = Date.now() + timeoutMs;

  let currentUrl = startUrl;

  for (let hop = 0; hop < maxHops; hop += 1) {
    const remainingMs = deadline - Date.now();
    if (remainingMs <= 0) {
      break;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), remainingMs);

    try {
      const response = await fetch(currentUrl, {
        method: 'GET',
        redirect: 'manual',
        signal: controller.signal,
        headers,
      });

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        if (!location) {
          additionalHops.push({ url: currentUrl, statusCode: response.status });
          break;
        }
        const nextUrl = resolveRedirectLocation(location, currentUrl);
        if (!nextUrl) {
          additionalHops.push({ url: currentUrl, statusCode: response.status });
          break;
        }
        additionalHops.push({ url: currentUrl, statusCode: response.status });
        currentUrl = nextUrl;
        continue;
      }

      const body = await readResponseBodyText(response);
      additionalHops.push({ url: currentUrl, statusCode: response.status });

      const bodyRedirect = extractRedirectUrlFromBody(body, currentUrl);
      if (bodyRedirect && bodyRedirect !== currentUrl) {
        currentUrl = bodyRedirect;
        continue;
      }

      break;
    } catch {
      break;
    } finally {
      clearTimeout(timer);
    }
  }

  if (additionalHops.length === 0) {
    const remainingMs = deadline - Date.now();
    if (remainingMs > 0) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), remainingMs);
      try {
        const response = await fetch(startUrl, {
          method: 'GET',
          redirect: 'follow',
          signal: controller.signal,
          headers,
        });
        if (response.url && response.url !== startUrl) {
          additionalHops.push({
            url: response.url,
            statusCode: response.status,
          });
        }
      } catch {
        // Best-effort fallback only.
      } finally {
        clearTimeout(timer);
      }
    }
  }

  return additionalHops;
}
