import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job, UnrecoverableError } from 'bullmq';
import {
  TELEGRAM_INCOMING_QUEUE,
  TELEGRAM_WEBHOOK_JOB_NAME,
} from './telegram-incoming.constants';
import { TelegramBotUiService } from './telegram-bot-ui.service';

@Processor(TELEGRAM_INCOMING_QUEUE, { concurrency: 4 })
export class TelegramIncomingProcessor extends WorkerHost {
  private readonly logger = new Logger(TelegramIncomingProcessor.name);

  constructor(private readonly botUi: TelegramBotUiService) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name !== TELEGRAM_WEBHOOK_JOB_NAME) {
      this.logger.warn(
        `skip incoming job unknown name=${job.name} id=${job.id?.toString() ?? 'n/a'}`,
      );
      throw new UnrecoverableError(`Unknown incoming job name: ${job.name}`);
    }
    await this.botUi.handleInboundJob(job as Job<{ raw?: unknown }>);
  }
}
