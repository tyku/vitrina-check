import { Inject, Injectable, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { TELEGRAM_WEBHOOK_DEDUP_REDIS } from './telegram-webhook-dedup.constants';

export const telegramWebhookDedupRedisProvider = {
  provide: TELEGRAM_WEBHOOK_DEDUP_REDIS,
  inject: [ConfigService],
  useFactory: (configService: ConfigService): Redis => {
    const url =
      configService.get<string>('redis.url') ?? 'redis://localhost:6379';
    const password = configService.get<string>('redis.password');
    return new Redis(url, password ? { password } : {});
  },
};

@Injectable()
export class TelegramWebhookDedupRedisLifecycle implements OnApplicationShutdown {
  constructor(
    @Inject(TELEGRAM_WEBHOOK_DEDUP_REDIS) private readonly redis: Redis,
  ) {}

  async onApplicationShutdown(): Promise<void> {
    await this.redis.quit();
  }
}
