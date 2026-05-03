import { getQueueToken } from '@nestjs/bullmq';
import { Test, TestingModule } from '@nestjs/testing';
import {
  TELEGRAM_OUTBOUND_JOB_API_CALL,
  TELEGRAM_OUTBOUND_QUEUE,
} from './telegram-outbound.constants';
import { TelegramOutboundService } from './telegram-outbound.service';

describe('TelegramOutboundService', () => {
  const add = jest.fn().mockResolvedValue({ id: 'j1' });
  let service: TelegramOutboundService;
  let moduleRef: TestingModule;

  beforeEach(async () => {
    add.mockClear();
    moduleRef = await Test.createTestingModule({
      providers: [
        TelegramOutboundService,
        {
          provide: getQueueToken(TELEGRAM_OUTBOUND_QUEUE),
          useValue: { add },
        },
      ],
    }).compile();
    service = moduleRef.get(TelegramOutboundService);
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  it('enqueues api call job', async () => {
    const payload = {
      method: 'sendMessage',
      params: { chat_id: 1, text: 'hi' },
      correlationId: 'c1',
    };
    await service.enqueueApiCall(payload);
    expect(add).toHaveBeenCalledTimes(1);
    expect(add).toHaveBeenCalledWith(
      TELEGRAM_OUTBOUND_JOB_API_CALL,
      payload,
      expect.objectContaining({
        removeOnComplete: 1000,
        removeOnFail: 500,
        attempts: 5,
      }),
    );
  });
});
