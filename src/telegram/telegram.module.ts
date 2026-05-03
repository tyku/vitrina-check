import { Module } from '@nestjs/common';
import { TelegramWebhookController } from './telegram-webhook.controller';
import { TelegramWebhookAuthService } from './telegram-webhook-auth.service';

@Module({
  controllers: [TelegramWebhookController],
  providers: [TelegramWebhookAuthService],
  exports: [TelegramWebhookAuthService],
})
export class TelegramModule {}
