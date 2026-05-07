import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type TelegramMethodResponse<T> = {
  ok: boolean;
  result?: T;
  description?: string;
};

type TelegramWebhookInfo = {
  url: string;
};

function trimTrailingSlash(v: string): string {
  return v.replace(/\/+$/, '');
}

function buildWebhookUrls(
  baseUrl: string,
  pathSecret?: string,
): {
  plain: string;
  withSecret?: string;
} {
  const normalizedBase = trimTrailingSlash(baseUrl);
  const plain = `${normalizedBase}/telegram/webhook`;
  if (!pathSecret) {
    return { plain };
  }
  return { plain, withSecret: `${plain}/${encodeURIComponent(pathSecret)}` };
}

@Injectable()
export class TelegramWebhookRegisterService implements OnApplicationBootstrap {
  private readonly logger = new Logger(TelegramWebhookRegisterService.name);

  constructor(private readonly configService: ConfigService) {}

  async onApplicationBootstrap(): Promise<void> {
    const token = this.configService.get<string>('telegram.botToken')?.trim();
    const publicBaseUrl = this.configService
      .get<string>('telegram.webhookPublicBaseUrl')
      ?.trim();
    if (!token) {
      this.logger.log(
        'skip auto webhook registration: TELEGRAM_BOT_TOKEN is empty',
      );
      return;
    }
    if (!publicBaseUrl) {
      this.logger.log(
        'skip auto webhook registration: TELEGRAM_WEBHOOK_PUBLIC_BASE_URL is empty',
      );
      return;
    }

    const pathSecret = this.configService
      .get<string>('telegram.webhookPathSecret')
      ?.trim();
    const secretToken = this.configService
      .get<string>('telegram.webhookSecretToken')
      ?.trim();
    const webhookUrls = buildWebhookUrls(publicBaseUrl, pathSecret);
    const targetUrl = webhookUrls.withSecret ?? webhookUrls.plain;

    const webhookInfo = await this.callTelegramApi<TelegramWebhookInfo>(
      token,
      'getWebhookInfo',
    );
    const currentUrl = webhookInfo.url.trim();
    if (pathSecret) {
      if (currentUrl === webhookUrls.withSecret) {
        this.logger.log(
          `webhook already configured with path secret: ${currentUrl}`,
        );
        return;
      }
      if (currentUrl === webhookUrls.plain) {
        this.logger.log(
          `webhook without path secret detected, migrating to secret path: ${targetUrl}`,
        );
      }
    } else if (currentUrl === webhookUrls.plain) {
      this.logger.log(`webhook already configured: ${currentUrl}`);
      return;
    }

    const payload: Record<string, string> = { url: targetUrl };
    if (secretToken) {
      payload.secret_token = secretToken;
    }
    await this.callTelegramApi(token, 'setWebhook', payload);
    this.logger.log(`webhook registered: ${targetUrl}`);
  }

  private async callTelegramApi<T>(
    token: string,
    method: string,
    payload?: Record<string, string>,
  ): Promise<T> {
    const url = `https://api.telegram.org/bot${token}/${method}`;
    const body = payload ? new URLSearchParams(payload).toString() : undefined;
    const response = await fetch(url, {
      method: 'POST',
      headers: body
        ? { 'Content-Type': 'application/x-www-form-urlencoded' }
        : undefined,
      body,
    });
    if (!response.ok) {
      const responseText = await response.text();
      throw new Error(
        `Telegram ${method} HTTP ${response.status}: ${responseText.slice(0, 500)}`,
      );
    }
    const data = (await response.json()) as TelegramMethodResponse<T>;
    if (!data.ok || data.result === undefined) {
      throw new Error(
        `Telegram ${method} failed: ${data.description ?? 'unknown error'}`,
      );
    }
    return data.result;
  }
}
