import { ConfigService } from '@nestjs/config';
import { Job, UnrecoverableError } from 'bullmq';
import { TELEGRAM_OUTBOUND_JOB_API_CALL } from './telegram-outbound.constants';
import {
  extractOutboundChatId,
  TelegramOutboundProcessor,
} from './telegram-outbound.processor';
import { TelegramOutboundRateLimitService } from './telegram-outbound-rate-limit.service';

describe('extractOutboundChatId', () => {
  it('returns string for numeric and string chat_id', () => {
    expect(extractOutboundChatId({ chat_id: -100 })).toBe('-100');
    expect(extractOutboundChatId({ chat_id: '42' })).toBe('42');
  });

  it('returns undefined when missing', () => {
    expect(extractOutboundChatId({})).toBeUndefined();
    expect(extractOutboundChatId({ chat_id: null })).toBeUndefined();
  });

  it('returns undefined for non-primitive chat_id', () => {
    expect(extractOutboundChatId({ chat_id: {} })).toBeUndefined();
  });
});

describe('TelegramOutboundProcessor', () => {
  const rateLimit: Pick<
    TelegramOutboundRateLimitService,
    'waitForOutboundSlot'
  > = {
    waitForOutboundSlot: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  function makeJob(overrides: Partial<Job>): Job {
    return {
      id: 'job-1',
      name: TELEGRAM_OUTBOUND_JOB_API_CALL,
      data: {
        method: 'sendMessage',
        params: { chat_id: 7, text: 'hi' },
      },
      ...overrides,
    } as Job;
  }

  it('waits for rate limit then skips HTTP without bot token', async () => {
    const config = {
      get: jest.fn((k: string) =>
        k === 'telegram.botToken' ? undefined : undefined,
      ),
    } as unknown as ConfigService;
    const processor = new TelegramOutboundProcessor(
      config,
      rateLimit as TelegramOutboundRateLimitService,
    );
    await processor.process(makeJob({}));
    expect(rateLimit.waitForOutboundSlot).toHaveBeenCalledWith('7', undefined);
  });

  it('calls Telegram API when token set', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve('{"ok":true}'),
    } as Response);
    const config = {
      get: jest.fn((k: string) =>
        k === 'telegram.botToken' ? 'tok' : undefined,
      ),
    } as unknown as ConfigService;
    const processor = new TelegramOutboundProcessor(
      config,
      rateLimit as TelegramOutboundRateLimitService,
    );
    await processor.process(makeJob({}));
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.telegram.org/bottok/sendMessage',
      expect.objectContaining({ method: 'POST' }),
    );
    fetchSpy.mockRestore();
  });

  it('sleeps and retries on 429 with retry_after then succeeds', async () => {
    jest.useFakeTimers();
    const fetchSpy = jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: () =>
          Promise.resolve(
            JSON.stringify({
              ok: false,
              error_code: 429,
              parameters: { retry_after: 2 },
            }),
          ),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve('{"ok":true}'),
      } as Response);
    const config = {
      get: jest.fn((k: string) => {
        if (k === 'telegram.botToken') return 'tok';
        if (k === 'telegram.outbound429DefaultRetrySeconds') return 5;
        if (k === 'telegram.outbound429MaxRounds') return 30;
        if (k === 'telegram.outbound429MaxWaitMs') return 3_600_000;
        return undefined;
      }),
    } as unknown as ConfigService;
    const processor = new TelegramOutboundProcessor(
      config,
      rateLimit as TelegramOutboundRateLimitService,
    );
    const done = processor.process(makeJob({}));
    await jest.advanceTimersByTimeAsync(2000);
    await done;
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    jest.useRealTimers();
    fetchSpy.mockRestore();
  });

  it('throws on non-429 error without retry', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 400,
      text: () => Promise.resolve('{"ok":false,"description":"bad"}'),
    } as Response);
    const config = {
      get: jest.fn((k: string) => {
        if (k === 'telegram.botToken') return 'tok';
        if (k === 'telegram.outbound429DefaultRetrySeconds') return 5;
        if (k === 'telegram.outbound429MaxRounds') return 30;
        if (k === 'telegram.outbound429MaxWaitMs') return 3_600_000;
        return undefined;
      }),
    } as unknown as ConfigService;
    const processor = new TelegramOutboundProcessor(
      config,
      rateLimit as TelegramOutboundRateLimitService,
    );
    await expect(processor.process(makeJob({}))).rejects.toThrow(
      'Telegram API 400',
    );
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    fetchSpy.mockRestore();
  });

  it('throws UnrecoverableError on invalid payload', async () => {
    const config = { get: jest.fn() } as unknown as ConfigService;
    const processor = new TelegramOutboundProcessor(
      config,
      rateLimit as TelegramOutboundRateLimitService,
    );
    await expect(
      processor.process(
        makeJob({
          data: { method: '', params: {} },
        }),
      ),
    ).rejects.toBeInstanceOf(UnrecoverableError);
  });

  it('throws UnrecoverableError for unknown job name', async () => {
    const config = { get: jest.fn() } as unknown as ConfigService;
    const processor = new TelegramOutboundProcessor(
      config,
      rateLimit as TelegramOutboundRateLimitService,
    );
    await expect(
      processor.process(makeJob({ name: 'other' })),
    ).rejects.toBeInstanceOf(UnrecoverableError);
  });
});
