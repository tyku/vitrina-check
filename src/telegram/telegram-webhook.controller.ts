import { Controller, HttpCode, Param, Post, Req } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { TelegramWebhookAuthService } from './telegram-webhook-auth.service';

@Controller('telegram')
export class TelegramWebhookController {
  constructor(
    private readonly telegramWebhookAuth: TelegramWebhookAuthService,
    private readonly configService: ConfigService,
  ) {}

  /** E1.2 will enqueue `body`; here we only verify and ACK. */
  @Post(['webhook', 'webhook/:pathSecret'])
  @HttpCode(200)
  receiveUpdate(
    @Req() req: Request,
    @Param('pathSecret') pathSecret: string | undefined,
  ): void {
    const headerName = this.configService.getOrThrow<string>(
      'telegram.webhookSecretHeaderName',
    );
    const raw = req.headers[headerName];
    const headerSecret =
      typeof raw === 'string' ? raw : Array.isArray(raw) ? raw[0] : undefined;
    this.telegramWebhookAuth.assertWebhookAuthorized(pathSecret, headerSecret);
  }
}
