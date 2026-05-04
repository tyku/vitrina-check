import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { TelegramOutboundRateLimitService } from './telegram-outbound-rate-limit.service';
import { TELEGRAM_WEBHOOK_DEDUP_REDIS } from './telegram-webhook-dedup.constants';

function mockConfig(botId = 'b1'): ConfigService {
  return {
    get: (k: string) => {
      if (k === 'telegram.botId') return botId;
      return undefined;
    },
  } as unknown as ConfigService;
}

describe('TelegramOutboundRateLimitService', () => {
  it('returns when Lua returns 0 delay', async () => {
    const redis = { eval: jest.fn().mockResolvedValue([0]) };
    const moduleRef = await Test.createTestingModule({
      providers: [
        TelegramOutboundRateLimitService,
        { provide: TELEGRAM_WEBHOOK_DEDUP_REDIS, useValue: redis },
        { provide: ConfigService, useFactory: () => mockConfig() },
      ],
    }).compile();
    const service = moduleRef.get(TelegramOutboundRateLimitService);
    await service.waitForOutboundSlot('123', 'c1');
    expect(redis.eval).toHaveBeenCalledTimes(1);
    await moduleRef.close();
  });

  it('sleeps and retries when Lua returns positive delay', async () => {
    jest.useFakeTimers();
    const redis = {
      eval: jest.fn().mockResolvedValueOnce([40]).mockResolvedValueOnce([0]),
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        TelegramOutboundRateLimitService,
        { provide: TELEGRAM_WEBHOOK_DEDUP_REDIS, useValue: redis },
        { provide: ConfigService, useFactory: () => mockConfig() },
      ],
    }).compile();
    const service = moduleRef.get(TelegramOutboundRateLimitService);
    const done = service.waitForOutboundSlot('123');
    await jest.advanceTimersByTimeAsync(40);
    await done;
    expect(redis.eval).toHaveBeenCalledTimes(2);
    jest.useRealTimers();
    await moduleRef.close();
  });

  it('uses global-only bucket when chat id absent', async () => {
    const redis = { eval: jest.fn().mockResolvedValue([0]) };
    const moduleRef = await Test.createTestingModule({
      providers: [
        TelegramOutboundRateLimitService,
        { provide: TELEGRAM_WEBHOOK_DEDUP_REDIS, useValue: redis },
        { provide: ConfigService, useFactory: () => mockConfig() },
      ],
    }).compile();
    const service = moduleRef.get(TelegramOutboundRateLimitService);
    await service.waitForOutboundSlot(undefined);
    expect(redis.eval).toHaveBeenCalledWith(
      expect.any(String),
      2,
      'telegram:outbound:tb:v1:b1:global',
      'telegram:outbound:tb:v1:b1:global',
      expect.any(String),
      '22',
      '25',
      '1',
      '2',
      '0',
    );
    await moduleRef.close();
  });
});
