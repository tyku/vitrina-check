import { getQueueToken } from '@nestjs/bullmq';
import { Test, TestingModule } from '@nestjs/testing';
import {
  TELEGRAM_INCOMING_QUEUE,
  TELEGRAM_WEBHOOK_JOB_NAME,
} from './telegram-incoming.constants';
import { TelegramWebhookInboundService } from './telegram-webhook-inbound.service';

describe('TelegramWebhookInboundService', () => {
  const add = jest.fn().mockResolvedValue({ id: 'job-1' });

  let service: TelegramWebhookInboundService;
  let moduleRef: TestingModule;

  beforeEach(async () => {
    add.mockClear();
    moduleRef = await Test.createTestingModule({
      providers: [
        TelegramWebhookInboundService,
        {
          provide: getQueueToken(TELEGRAM_INCOMING_QUEUE),
          useValue: { add },
        },
      ],
    }).compile();
    service = moduleRef.get(TelegramWebhookInboundService);
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  it('adds job with raw payload and job name', async () => {
    const raw = { update_id: 42, message: { text: 'hi' } };
    await service.enqueueWebhookUpdate(raw);
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
