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
});
