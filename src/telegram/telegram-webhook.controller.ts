import { Controller, HttpCode, Param, Post, Req } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { TelegramWebhookAuthService } from './telegram-webhook-auth.service';
import { TelegramWebhookInboundService } from './telegram-webhook-inbound.service';

@Controller('telegram')
export class TelegramWebhookController {
  constructor(
    private readonly telegramWebhookAuth: TelegramWebhookAuthService,
    private readonly telegramWebhookInbound: TelegramWebhookInboundService,
    private readonly configService: ConfigService,
  ) {}

  /** Verifies secrets, enqueues raw update (E1.2), returns 200. */
  @Post(['webhook', 'webhook/:pathSecret'])
  @HttpCode(200)
  async receiveUpdate(
    @Req() req: Request,
    @Param('pathSecret') pathSecret: string | undefined,
  ): Promise<void> {
    const headerName = this.configService.getOrThrow<string>(
      'telegram.webhookSecretHeaderName',
    );
    const hdr = req.headers[headerName];
    const headerSecret =
      typeof hdr === 'string' ? hdr : Array.isArray(hdr) ? hdr[0] : undefined;
    this.telegramWebhookAuth.assertWebhookAuthorized(pathSecret, headerSecret);
    await this.telegramWebhookInbound.enqueueWebhookUpdate(req.body);
  }
}
