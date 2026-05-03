import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import {
  TELEGRAM_OUTBOUND_JOB_API_CALL,
  TELEGRAM_OUTBOUND_QUEUE,
} from './telegram-outbound.constants';

/** Payload for a future worker that calls `api.telegram.org` (E3.2+). */
export type TelegramOutboundApiCallPayload = {
  method: string;
  params: Record<string, unknown>;
  correlationId?: string;
};

@Injectable()
export class TelegramOutboundService {
  constructor(
    @InjectQueue(TELEGRAM_OUTBOUND_QUEUE)
    private readonly outboundQueue: Queue,
  ) {}

  /**
   * Puts one Bot API outbound request into BullMQ. No HTTP here (E3.1).
   */
  async enqueueApiCall(payload: TelegramOutboundApiCallPayload): Promise<void> {
    await this.outboundQueue.add(TELEGRAM_OUTBOUND_JOB_API_CALL, payload, {
      removeOnComplete: 1000,
      removeOnFail: 500,
      attempts: 5,
    });
  }
}
