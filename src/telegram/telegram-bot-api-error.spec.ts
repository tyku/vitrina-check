import { parseRetryAfterSecondsFromTelegramBody } from './telegram-bot-api-error';

describe('parseRetryAfterSecondsFromTelegramBody', () => {
  it('reads parameters.retry_after', () => {
    const body = JSON.stringify({
      ok: false,
      error_code: 429,
      parameters: { retry_after: 17 },
    });
    expect(parseRetryAfterSecondsFromTelegramBody(body, 5)).toBe(17);
  });

  it('uses fallback when missing', () => {
    expect(
      parseRetryAfterSecondsFromTelegramBody('{"ok":false}', 12),
    ).toBe(12);
  });

  it('uses fallback on invalid JSON', () => {
    expect(parseRetryAfterSecondsFromTelegramBody('not json', 3)).toBe(3);
  });

  it('clamps huge values to 86400', () => {
    const body = JSON.stringify({
      parameters: { retry_after: 200000 },
    });
    expect(parseRetryAfterSecondsFromTelegramBody(body, 5)).toBe(86400);
  });
});
