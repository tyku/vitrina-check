import { extractRedirectUrlFromBody } from './extract-redirect-url-from-body';

describe('extractRedirectUrlFromBody', () => {
  const baseUrl = 'https://goto.startracking.ru/api/v1/redirect?offer_id=1';

  it('extracts meta refresh URL', () => {
    const body =
      '<html><head><meta http-equiv="refresh" content="0;url=https://zaymer.ru/landing"></head></html>';
    expect(extractRedirectUrlFromBody(body, baseUrl)).toBe(
      'https://zaymer.ru/landing',
    );
  });

  it('extracts window.location redirect', () => {
    const body =
      '<script>window.location.href = "https://webbankir.com/go";</script>';
    expect(extractRedirectUrlFromBody(body, baseUrl)).toBe(
      'https://webbankir.com/go',
    );
  });

  it('extracts JSON redirectUrl field', () => {
    const body = '{"redirectUrl":"https://example-mfo.ru/apply"}';
    expect(extractRedirectUrlFromBody(body, baseUrl)).toBe(
      'https://example-mfo.ru/apply',
    );
  });

  it('returns null when no redirect is present', () => {
    expect(extractRedirectUrlFromBody('<html>ok</html>', baseUrl)).toBeNull();
  });
});
