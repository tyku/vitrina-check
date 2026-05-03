import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { TelegramWebhookController } from './telegram-webhook.controller';
import { TelegramWebhookAuthService } from './telegram-webhook-auth.service';
import { TelegramWebhookInboundService } from './telegram-webhook-inbound.service';
import { TelegramWebhookLimitsInterceptor } from './telegram-webhook-limits.interceptor';
import {
  telegramWebhookDedupRedisProvider,
  TelegramWebhookDedupRedisLifecycle,
} from './telegram-webhook-dedup-redis.provider';
import { TelegramWebhookUpdateDedupService } from './telegram-webhook-update-dedup.service';
import { TELEGRAM_INCOMING_QUEUE } from './telegram-incoming.constants';

@Module({
  imports: [
    BullModule.registerQueue({
      name: TELEGRAM_INCOMING_QUEUE,
    }),
  ],
  controllers: [TelegramWebhookController],
  providers: [
    TelegramWebhookAuthService,
    telegramWebhookDedupRedisProvider,
    TelegramWebhookDedupRedisLifecycle,
    TelegramWebhookUpdateDedupService,
    TelegramWebhookInboundService,
    TelegramWebhookLimitsInterceptor,
  ],
  exports: [TelegramWebhookAuthService, BullModule],
})
export class TelegramModule {}
