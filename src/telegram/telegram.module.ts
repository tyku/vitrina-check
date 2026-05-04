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
import { TELEGRAM_OUTBOUND_QUEUE } from './telegram-outbound.constants';
import { TelegramOutboundProcessor } from './telegram-outbound.processor';
import { TelegramOutboundRateLimitService } from './telegram-outbound-rate-limit.service';
import { TelegramOutboundService } from './telegram-outbound.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: TELEGRAM_INCOMING_QUEUE,
    }),
    BullModule.registerQueue({
      name: TELEGRAM_OUTBOUND_QUEUE,
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
    TelegramOutboundService,
    TelegramOutboundRateLimitService,
    TelegramOutboundProcessor,
  ],
  exports: [TelegramWebhookAuthService, TelegramOutboundService, BullModule],
})
export class TelegramModule {}
