const DEFAULT_SHORT_HOSTS = new Set([
  'bit.ly',
  't.co',
  'tinyurl.com',
  'cutt.ly',
  'clck.ru',
  'goo.su',
  'sovtrk.com',
  'sovtrk.ru',
  'startracker.ru',
]);

export function isShortLink(url: string, knownHosts: string[] = []): boolean {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    const path = parsed.pathname;
    const customHosts = new Set(knownHosts.map((host) => host.toLowerCase()));

    if (DEFAULT_SHORT_HOSTS.has(hostname) || customHosts.has(hostname)) {
      return true;
    }

    // Heuristic for generic shorteners with tiny path slugs.
    return (
      /^\/[a-z0-9_-]{2,12}$/i.test(path) ||
      /^\/c\/[a-z0-9_-]{2,20}$/i.test(path)
    );
  } catch {
    return false;
  }
}
