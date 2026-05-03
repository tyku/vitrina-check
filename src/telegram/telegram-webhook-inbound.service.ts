import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import {
  TELEGRAM_INCOMING_QUEUE,
  TELEGRAM_WEBHOOK_JOB_NAME,
} from './telegram-incoming.constants';

@Injectable()
export class TelegramWebhookInboundService {
  constructor(
    @InjectQueue(TELEGRAM_INCOMING_QUEUE)
    private readonly incomingQueue: Queue,
  ) {}

  /**
   * Pushes the raw webhook body to Redis. Consumer (E2+) processes `data.raw`.
   */
  async enqueueWebhookUpdate(raw: unknown): Promise<void> {
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
