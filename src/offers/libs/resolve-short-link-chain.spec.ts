import { resolveShortLinkChain } from './resolve-short-link-chain';

describe('resolveShortLinkChain', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('follows manual redirects and records each hop', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        status: 302,
        headers: {
          get: (name: string) =>
            name.toLowerCase() === 'location'
              ? 'https://tracker.example/next'
              : null,
        },
        arrayBuffer: async () => new ArrayBuffer(0),
      } as Response)
      .mockResolvedValueOnce({
        status: 200,
        headers: { get: () => null },
        arrayBuffer: async () => new ArrayBuffer(0),
      } as Response);

    const result = await resolveShortLinkChain(
      'https://sovtrk.com/c/test',
      5_000,
      undefined,
      10,
    );

    expect(result.error).toBe('');
    expect(result.chain).toHaveLength(2);
    expect(result.chain[0]?.url).toContain('sovtrk.com');
    expect(result.chain[0]?.statusCode).toBe(302);
    expect(result.chain[1]?.url).toBe('https://tracker.example/next');
    expect(result.chain[1]?.statusCode).toBe(200);
    expect(result.finalUrl).toBe('https://tracker.example/next');
  });
});
