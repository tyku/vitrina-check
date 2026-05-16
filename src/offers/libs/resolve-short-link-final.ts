import type { TResolvedShortLink } from '../types';
import {
  buildShortLinkResolverHeaders,
  drainResponseBody,
  withNoCacheQueryParam,
} from './short-link-resolver.shared';

export async function resolveShortLinkToFinal(
  sourceUrl: string,
  timeoutMs: number,
  requestHeaders?: Record<string, string>,
): Promise<TResolvedShortLink> {
  const requestUrl = withNoCacheQueryParam(sourceUrl);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const headers = buildShortLinkResolverHeaders(requestHeaders);

  try {
    const response = await fetch(requestUrl, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers,
    });
    await drainResponseBody(response);

    return {
      sourceUrl,
      finalUrl: response.url,
      statusCode: response.status,
      error: '',
    };
  } catch (error) {
    return {
      sourceUrl,
      finalUrl: '',
      statusCode: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timer);
  }
}
