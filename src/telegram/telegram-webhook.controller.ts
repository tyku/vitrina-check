import { Controller, Headers, HttpCode, Param, Post } from '@nestjs/common';
import {
  TelegramWebhookAuthService,
  TELEGRAM_WEBHOOK_SECRET_HEADER,
} from './telegram-webhook-auth.service';

@Controller('telegram')
export class TelegramWebhookController {
  constructor(
    private readonly telegramWebhookAuth: TelegramWebhookAuthService,
  ) {}

  /** E1.2 will enqueue `body`; here we only verify and ACK. */
  @Post(['webhook', 'webhook/:pathSecret'])
  @HttpCode(200)
  receiveUpdate(
    @Param('pathSecret') pathSecret: string | undefined,
    @Headers(TELEGRAM_WEBHOOK_SECRET_HEADER) headerSecret: string | undefined,
  ): void {
    this.telegramWebhookAuth.assertWebhookAuthorized(pathSecret, headerSecret);
  }
}
