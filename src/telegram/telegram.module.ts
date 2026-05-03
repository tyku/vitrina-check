import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { TelegramWebhookController } from './telegram-webhook.controller';
import { TelegramWebhookAuthService } from './telegram-webhook-auth.service';
import { TelegramWebhookInboundService } from './telegram-webhook-inbound.service';
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
    TelegramWebhookInboundService,
  ],
  exports: [TelegramWebhookAuthService, BullModule],
})
export class TelegramModule {}
