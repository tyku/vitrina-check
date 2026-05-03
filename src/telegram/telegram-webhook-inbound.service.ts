import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import {
  TELEGRAM_INCOMING_QUEUE,
  TELEGRAM_WEBHOOK_JOB_NAME,
} from './telegram-incoming.constants';
import { TelegramWebhookUpdateDedupService } from './telegram-webhook-update-dedup.service';

@Injectable()
export class TelegramWebhookInboundService {
  constructor(
    @InjectQueue(TELEGRAM_INCOMING_QUEUE)
    private readonly incomingQueue: Queue,
    private readonly updateDedup: TelegramWebhookUpdateDedupService,
  ) {}

  /**
   * Dedupes by `update_id` (E2.1), then pushes the raw body to BullMQ.
   */
  async enqueueWebhookUpdate(raw: unknown): Promise<void> {
    const first = await this.updateDedup.claimFirstDelivery(raw);
    if (!first) {
      return;
    }
    await this.incomingQueue.add(
      TELEGRAM_WEBHOOK_JOB_NAME,
      { raw },
      {
        removeOnComplete: 1000,
        removeOnFail: 500,
        attempts: 3,
      },
    );
  }
}
