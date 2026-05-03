import { summarizeTelegramUpdateForLog } from './telegram-update-log-summary';

describe('summarizeTelegramUpdateForLog', () => {
  it('returns empty for non-object', () => {
    expect(summarizeTelegramUpdateForLog(null)).toEqual({});
    expect(summarizeTelegramUpdateForLog('x')).toEqual({});
    expect(summarizeTelegramUpdateForLog([])).toEqual({});
  });

  it('returns update_id and message type', () => {
    expect(
      summarizeTelegramUpdateForLog({
        update_id: 7,
        message: { text: 'secret' },
      }),
    ).toEqual({ update_id: 7, update_types: ['message'] });
  });

  it('does not include message text in output', () => {
    const s = summarizeTelegramUpdateForLog({
        update_id: 1,
        message: { text: 'password=123' },
      }) as Record<string, unknown>;
    expect(JSON.stringify(s)).not.toContain('password');
  });
});
