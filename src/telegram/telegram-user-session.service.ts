import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { TELEGRAM_WEBHOOK_DEDUP_REDIS } from './telegram-webhook-dedup.constants';

const SESSION_KEY_PREFIX = 'telegram:ui:session:v1:';
const SESSION_TTL_SECONDS = 900;

export type TTelegramUiSessionAction = 'add_vitrina';

export type TTelegramUiSession = {
  action: TTelegramUiSessionAction;
};

@Injectable()
export class TelegramUserSessionService {
  constructor(
    @Inject(TELEGRAM_WEBHOOK_DEDUP_REDIS) private readonly redis: Redis,
  ) {}

  async get(telegramUserId: string): Promise<TTelegramUiSession | null> {
    const raw = await this.redis.get(this.sessionKey(telegramUserId));
    if (!raw) {
      return null;
    }
    try {
      const parsed = JSON.parse(raw) as TTelegramUiSession;
      if (parsed.action === 'add_vitrina') {
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  }

  async setAddVitrina(telegramUserId: string): Promise<void> {
    await this.redis.set(
      this.sessionKey(telegramUserId),
      JSON.stringify({ action: 'add_vitrina' satisfies TTelegramUiSessionAction }),
      'EX',
      SESSION_TTL_SECONDS,
    );
  }

  async clear(telegramUserId: string): Promise<void> {
    await this.redis.del(this.sessionKey(telegramUserId));
  }

  private sessionKey(telegramUserId: string): string {
    return `${SESSION_KEY_PREFIX}${telegramUserId}`;
  }
}
