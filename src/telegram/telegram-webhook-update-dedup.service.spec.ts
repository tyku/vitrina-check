import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { TELEGRAM_WEBHOOK_DEDUP_REDIS } from './telegram-webhook-dedup.constants';
import { TelegramWebhookUpdateDedupService } from './telegram-webhook-update-dedup.service';

describe('TelegramWebhookUpdateDedupService', () => {
  const set = jest.fn();
  let service: TelegramWebhookUpdateDedupService;
  let moduleRef: TestingModule;

  beforeEach(async () => {
    set.mockReset();
    moduleRef = await Test.createTestingModule({
      providers: [
        TelegramWebhookUpdateDedupService,
        {
          provide: TELEGRAM_WEBHOOK_DEDUP_REDIS,
          useValue: { set, quit: jest.fn() },
        },
        {
          provide: ConfigService,
          useValue: {
            get: (k: string) => {
              if (k === 'telegram.botId') return 'bot1';
              if (k === 'telegram.webhookDedupeTtlSeconds') return 120;
              return undefined;
            },
          },
        },
      ],
    }).compile();
    service = moduleRef.get(TelegramWebhookUpdateDedupService);
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  it('returns true and sets NX when Redis returns OK', async () => {
    set.mockResolvedValueOnce('OK');
    await expect(service.claimFirstDelivery({ update_id: 9 })).resolves.toBe(
      true,
    );
    expect(set).toHaveBeenCalledWith(
      'telegram:webhook:dedup:v1:bot1:9',
      '1',
      'EX',
      120,
      'NX',
    );
  });

  it('returns false when key already exists', async () => {
    set.mockResolvedValueOnce(null);
    await expect(service.claimFirstDelivery({ update_id: 9 })).resolves.toBe(
      false,
    );
  });

  it('returns true when update_id missing (no dedup)', async () => {
    await expect(service.claimFirstDelivery({})).resolves.toBe(true);
    expect(set).not.toHaveBeenCalled();
  });

  it('returns true on Redis error (fail-open)', async () => {
    set.mockRejectedValueOnce(new Error('down'));
    await expect(service.claimFirstDelivery({ update_id: 1 })).resolves.toBe(
      true,
    );
  });

  describe('claimFirstCallbackDelivery (E2.2)', () => {
    let svc: TelegramWebhookUpdateDedupService;
    let mod: TestingModule;

    afterEach(async () => {
      await mod.close();
    });

    it('returns true when disabled without calling Redis', async () => {
      set.mockClear();
      mod = await Test.createTestingModule({
        providers: [
          TelegramWebhookUpdateDedupService,
          { provide: TELEGRAM_WEBHOOK_DEDUP_REDIS, useValue: { set, quit: jest.fn() } },
          {
            provide: ConfigService,
            useValue: {
              get: (k: string) => {
                if (k === 'telegram.callbackDedupeEnabled') return false;
                return undefined;
              },
            },
          },
        ],
      }).compile();
      svc = mod.get(TelegramWebhookUpdateDedupService);
      await expect(
        svc.claimFirstCallbackDelivery({
          callback_query: { id: 'cb-1' },
        }),
      ).resolves.toBe(true);
      expect(set).not.toHaveBeenCalled();
    });

    it('sets NX with short TTL when enabled', async () => {
      set.mockResolvedValueOnce('OK');
      mod = await Test.createTestingModule({
        providers: [
          TelegramWebhookUpdateDedupService,
          { provide: TELEGRAM_WEBHOOK_DEDUP_REDIS, useValue: { set, quit: jest.fn() } },
          {
            provide: ConfigService,
            useValue: {
              get: (k: string) => {
                if (k === 'telegram.callbackDedupeEnabled') return true;
                if (k === 'telegram.botId') return 'bot1';
                if (k === 'telegram.callbackDedupeTtlSeconds') return 90;
                return undefined;
              },
            },
          },
        ],
      }).compile();
      svc = mod.get(TelegramWebhookUpdateDedupService);
      await expect(
        svc.claimFirstCallbackDelivery({
          callback_query: { id: 'cb-xyz' },
        }),
      ).resolves.toBe(true);
      expect(set).toHaveBeenCalledWith(
        'telegram:webhook:callback:v1:bot1:cb-xyz',
        '1',
        'EX',
        90,
        'NX',
      );
    });

    it('returns false on duplicate callback id', async () => {
      set.mockResolvedValueOnce(null);
      mod = await Test.createTestingModule({
        providers: [
          TelegramWebhookUpdateDedupService,
          { provide: TELEGRAM_WEBHOOK_DEDUP_REDIS, useValue: { set, quit: jest.fn() } },
          {
            provide: ConfigService,
            useValue: {
              get: (k: string) => {
                if (k === 'telegram.callbackDedupeEnabled') return true;
                if (k === 'telegram.botId') return 'b';
                if (k === 'telegram.callbackDedupeTtlSeconds') return 60;
                return undefined;
              },
            },
          },
        ],
      }).compile();
      svc = mod.get(TelegramWebhookUpdateDedupService);
      await expect(
        svc.claimFirstCallbackDelivery({ callback_query: { id: 'dup' } }),
      ).resolves.toBe(false);
    });
  });
});
