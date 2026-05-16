import type { TRedirectHop, TResolvedShortLinkWithChain } from '../types';
import {
  buildShortLinkResolverHeaders,
  DEFAULT_SHORT_LINK_MAX_HOPS,
  drainResponseBody,
  withNoCacheQueryParam,
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

export async function resolveShortLinkChain(
  sourceUrl: string,
  timeoutMs: number,
  requestHeaders?: Record<string, string>,
  maxHops: number = DEFAULT_SHORT_LINK_MAX_HOPS,
): Promise<TResolvedShortLinkWithChain> {
  const chain: TRedirectHop[] = [];
  const deadline = Date.now() + timeoutMs;
  const headers = buildShortLinkResolverHeaders(requestHeaders);

  let currentUrl = withNoCacheQueryParam(sourceUrl);
  let lastStatusCode = 0;
  let error = '';

  for (let hop = 0; hop < maxHops; hop += 1) {
    const remainingMs = deadline - Date.now();
    if (remainingMs <= 0) {
      error = 'timeout';
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
      await drainResponseBody(response);

      lastStatusCode = response.status;
      chain.push({ url: currentUrl, statusCode: response.status });

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        if (!location) {
          error = 'redirect without Location header';
          break;
        }
        const nextUrl = resolveRedirectLocation(location, currentUrl);
        if (!nextUrl) {
          error = 'invalid redirect Location';
          break;
        }
        currentUrl = nextUrl;
        continue;
      }

      error = '';
      break;
    } catch (caught) {
      error = caught instanceof Error ? caught.message : String(caught);
      if (chain.length === 0) {
        chain.push({ url: currentUrl, statusCode: 0 });
      }
      break;
    } finally {
      clearTimeout(timer);
    }
  }

  if (!error && chain.length >= maxHops) {
    const lastHop = chain[chain.length - 1];
    if (lastHop && lastHop.statusCode >= 300 && lastHop.statusCode < 400) {
      error = 'max hops exceeded';
    }
  }

  const finalUrl =
    chain.length > 0 ? chain[chain.length - 1]?.url || currentUrl : currentUrl;

  return {
    sourceUrl,
    finalUrl: error && lastStatusCode === 0 ? '' : finalUrl,
    statusCode: lastStatusCode,
    error,
    chain,
  };
}
