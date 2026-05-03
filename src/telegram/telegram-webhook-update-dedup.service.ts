import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type Redis from 'ioredis';
import {
  TELEGRAM_WEBHOOK_DEDUP_REDIS,
  telegramWebhookDedupKey,
} from './telegram-webhook-dedup.constants';

@Injectable()
export class TelegramWebhookUpdateDedupService {
  private readonly logger = new Logger(TelegramWebhookUpdateDedupService.name);

  constructor(
    @Inject(TELEGRAM_WEBHOOK_DEDUP_REDIS) private readonly redis: Redis,
    private readonly configService: ConfigService,
  ) {}

  /**
   * @returns `true` if this delivery should be enqueued (first time or no `update_id` / Redis error).
   * `false` if the same `update_id` was seen within TTL (duplicate Telegram delivery).
   */
  async claimFirstDelivery(raw: unknown): Promise<boolean> {
    const updateId = this.parseUpdateId(raw);
    if (updateId === undefined) {
      return true;
    }
    const botId =
      this.configService.get<string>('telegram.botId') ?? 'default';
    const ttlSeconds =
      this.configService.get<number>('telegram.webhookDedupeTtlSeconds') ??
      86400;
    const key = telegramWebhookDedupKey(botId, updateId);
    try {
      const res = await this.redis.set(key, '1', 'EX', ttlSeconds, 'NX');
      return res === 'OK';
    } catch (err: unknown) {
      this.logger.warn(
        `dedup redis error for update_id=${String(updateId)}: ${String(err)}`,
      );
      return true;
    }
  }

  private parseUpdateId(raw: unknown): number | undefined {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return undefined;
    }
    const v = (raw as Record<string, unknown>).update_id;
    if (typeof v === 'number' && Number.isInteger(v) && v >= 0) {
      return v;
    }
    if (typeof v === 'string' && /^\d+$/.test(v)) {
      const n = parseInt(v, 10);
      return Number.isFinite(n) ? n : undefined;
    }
    return undefined;
  }
}
