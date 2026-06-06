import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { TELEGRAM_WEBHOOK_DEDUP_REDIS } from './telegram-webhook-dedup.constants';

const SESSION_KEY_PREFIX = 'telegram:ui:session:v1:';
const SESSION_TTL_SECONDS = 900;

export type TTelegramUiSession =
  | { action: 'add_vitrina' }
  | { action: 'add_offer_tag'; checklistId: string };

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
      if (
        parsed.action === 'add_offer_tag' &&
        typeof parsed.checklistId === 'string' &&
        parsed.checklistId.length > 0
      ) {
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  }

  async setAddVitrina(telegramUserId: string): Promise<void> {
    await this.setSession(telegramUserId, { action: 'add_vitrina' });
  }

  async setAddOfferTag(
    telegramUserId: string,
    checklistId: string,
  ): Promise<void> {
    await this.setSession(telegramUserId, {
      action: 'add_offer_tag',
      checklistId,
    });
  }

  private async setSession(
    telegramUserId: string,
    session: TTelegramUiSession,
  ): Promise<void> {
    await this.redis.set(
      this.sessionKey(telegramUserId),
      JSON.stringify(session),
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
