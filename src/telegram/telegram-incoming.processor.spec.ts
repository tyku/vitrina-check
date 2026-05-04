import { Job, UnrecoverableError } from 'bullmq';
import { TelegramIncomingProcessor } from './telegram-incoming.processor';
import { TELEGRAM_WEBHOOK_JOB_NAME } from './telegram-incoming.constants';
import { TelegramBotUiService } from './telegram-bot-ui.service';

describe('TelegramIncomingProcessor', () => {
  it('delegates to bot UI for webhook job', async () => {
    const botUi = {
      handleInboundJob: jest.fn().mockResolvedValue(undefined),
    };
    const processor = new TelegramIncomingProcessor(
      botUi as TelegramBotUiService,
    );
    await processor.process({
      name: TELEGRAM_WEBHOOK_JOB_NAME,
      id: '1',
      data: { raw: {} },
    } as Job);
    expect(botUi.handleInboundJob).toHaveBeenCalledTimes(1);
  });

  it('throws UnrecoverableError on unknown job name', async () => {
    const processor = new TelegramIncomingProcessor({
      handleInboundJob: jest.fn(),
    } as TelegramBotUiService);
    await expect(
      processor.process({ name: 'other', id: '1', data: {} } as Job),
    ).rejects.toBeInstanceOf(UnrecoverableError);
  });
});
