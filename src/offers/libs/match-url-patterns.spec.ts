import {
  findFirstUrlPatternMatchInChain,
  urlMatchesPatterns,
} from './match-url-patterns';

describe('urlMatchesPatterns', () => {
  it('matches pattern in hostname', () => {
    expect(
      urlMatchesPatterns('https://sovtrk.com/c/abc', ['sovtrk.com']),
    ).toBe(true);
  });

  it('matches pattern in query value', () => {
    expect(
      urlMatchesPatterns(
        'https://landing.example/?utm_source=sravniru&wmid=1',
        ['sravni'],
      ),
    ).toBe(true);
  });

  it('does not match unrelated opaque source param', () => {
    expect(
      urlMatchesPatterns('https://landing.example/?source=sdf434rf', [
        'sravni',
        'startracker',
      ]),
    ).toBe(false);
  });
});

describe('findFirstUrlPatternMatchInChain', () => {
  it('returns first hop that matches, not only final', () => {
    const match = findFirstUrlPatternMatchInChain(
      [
        { url: 'https://sovtrk.com/c/x' },
        { url: 'https://tracker.example/aff?wmid=1' },
        { url: 'https://landing.example/?source=opaque' },
      ],
      ['startracker'],
    );
    expect(match).toBeNull();

    const sravniMatch = findFirstUrlPatternMatchInChain(
      [
        { url: 'https://sovtrk.com/c/x' },
        { url: 'https://go.sravni.ru/click?id=1' },
        { url: 'https://landing.example/?source=opaque' },
      ],
      ['sravni'],
    );
    expect(sravniMatch).toEqual({
      hopIndex: 1,
      matchedUrl: 'https://go.sravni.ru/click?id=1',
    });
  });

  it('matches on final hop when pattern only there', () => {
    const match = findFirstUrlPatternMatchInChain(
      [
        { url: 'https://bit.ly/abc' },
        { url: 'https://partner.example/?utm_source=sravniru' },
      ],
      ['sravni'],
    );
    expect(match?.hopIndex).toBe(1);
  });
});
