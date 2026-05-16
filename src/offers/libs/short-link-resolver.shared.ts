export const DEFAULT_SHORT_LINK_RESOLVER_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

export const DEFAULT_SHORT_LINK_MAX_HOPS = 20;

export function withNoCacheQueryParam(sourceUrl: string): string {
  return sourceUrl.includes('?') ? `${sourceUrl}&nc=1` : `${sourceUrl}?nc=1`;
}

export function buildShortLinkResolverHeaders(
  requestHeaders?: Record<string, string>,
): Record<string, string> {
  return {
    'user-agent': DEFAULT_SHORT_LINK_RESOLVER_USER_AGENT,
    ...requestHeaders,
  };
}

export async function mapUniqueUrlsWithConcurrency<T>(
  urls: string[],
  concurrency: number,
  mapper: (url: string) => Promise<T>,
): Promise<T[]> {
  const queue = [...new Set(urls)];
  const results: T[] = [];

  const worker = async () => {
    while (queue.length > 0) {
      const url = queue.shift();
      if (!url) continue;
      results.push(await mapper(url));
    }
  };

  await Promise.all(
    Array.from({ length: Math.max(1, concurrency) }, () => worker()),
  );
  return results;
}

export async function drainResponseBody(response: Response): Promise<void> {
  try {
    await response.arrayBuffer();
  } catch {
    // Best-effort: release connection on redirect hops.
  }
}
