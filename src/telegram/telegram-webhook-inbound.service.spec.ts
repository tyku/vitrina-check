import { getQueueToken } from '@nestjs/bullmq';
import { Test, TestingModule } from '@nestjs/testing';
import {
  TELEGRAM_INCOMING_QUEUE,
  TELEGRAM_WEBHOOK_JOB_NAME,
} from './telegram-incoming.constants';
import { TelegramWebhookInboundService } from './telegram-webhook-inbound.service';
import { TelegramWebhookUpdateDedupService } from './telegram-webhook-update-dedup.service';

describe('TelegramWebhookInboundService', () => {
  const add = jest.fn().mockResolvedValue({ id: 'job-1' });
  const claimFirstCallbackDelivery = jest.fn().mockResolvedValue(true);
  const claimFirstDelivery = jest.fn().mockResolvedValue(true);

  let service: TelegramWebhookInboundService;
  let moduleRef: TestingModule;

  beforeEach(async () => {
    add.mockClear();
    claimFirstCallbackDelivery.mockReset().mockResolvedValue(true);
    claimFirstDelivery.mockReset().mockResolvedValue(true);
    moduleRef = await Test.createTestingModule({
      providers: [
        TelegramWebhookInboundService,
        {
          provide: getQueueToken(TELEGRAM_INCOMING_QUEUE),
          useValue: { add },
        },
        {
          provide: TelegramWebhookUpdateDedupService,
          useValue: {
            claimFirstCallbackDelivery,
            claimFirstDelivery,
          },
        },
      ],
    }).compile();
    service = moduleRef.get(TelegramWebhookInboundService);
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  it('skips queue when callback dedup returns false', async () => {
    claimFirstCallbackDelivery.mockResolvedValueOnce(false);
    await service.enqueueWebhookUpdate({
      update_id: 1,
      callback_query: { id: 'x' },
    });
    expect(add).not.toHaveBeenCalled();
    expect(claimFirstDelivery).not.toHaveBeenCalled();
  });

  it('skips queue when update_id dedup returns false', async () => {
    claimFirstDelivery.mockResolvedValueOnce(false);
    await service.enqueueWebhookUpdate({ update_id: 1 });
    expect(claimFirstCallbackDelivery).toHaveBeenCalled();
    expect(add).not.toHaveBeenCalled();
  });

  it('adds job with raw payload and job name', async () => {
    const raw = { update_id: 42, message: { text: 'hi' } };
    await service.enqueueWebhookUpdate(raw);
    expect(claimFirstCallbackDelivery).toHaveBeenCalledWith(raw);
    expect(claimFirstDelivery).toHaveBeenCalledWith(raw);
    expect(add).toHaveBeenCalledTimes(1);
    expect(add).toHaveBeenCalledWith(
      TELEGRAM_WEBHOOK_JOB_NAME,
      { raw },
      expect.objectContaining({
        removeOnComplete: 1000,
        removeOnFail: 500,
        attempts: 3,
      }),
    );
  });
});
