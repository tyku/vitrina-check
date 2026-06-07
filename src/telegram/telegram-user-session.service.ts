import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import type { SchedulePeriodicity } from '../schedules/schemas/schedule.schema';
import { TELEGRAM_WEBHOOK_DEDUP_REDIS } from './telegram-webhook-dedup.constants';

const SESSION_KEY_PREFIX = 'telegram:ui:session:v1:';
const SESSION_TTL_SECONDS = 900;

export type TTelegramUiSession =
  | { action: 'add_vitrina' }
  | { action: 'add_offer_tag'; checklistId: string }
  | {
      action: 'set_schedule_time';
      scheduleId?: string;
      pendingPeriodicity?: SchedulePeriodicity;
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
      if (
        parsed.action === 'add_offer_tag' &&
        typeof parsed.checklistId === 'string' &&
        parsed.checklistId.length > 0
      ) {
        return parsed;
      }
      if (parsed.action === 'set_schedule_time') {
        const scheduleId =
          typeof parsed.scheduleId === 'string' && parsed.scheduleId.length > 0
            ? parsed.scheduleId
            : undefined;
        const pendingPeriodicity =
          typeof parsed.pendingPeriodicity === 'string'
            ? parsed.pendingPeriodicity
            : undefined;
        if (scheduleId || pendingPeriodicity) {
          return {
            action: 'set_schedule_time',
            scheduleId,
            pendingPeriodicity: pendingPeriodicity as
              | SchedulePeriodicity
              | undefined,
          };
        }
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

  async setScheduleTime(
    telegramUserId: string,
    options: {
      scheduleId?: string;
      pendingPeriodicity?: SchedulePeriodicity;
    },
  ): Promise<void> {
    await this.setSession(telegramUserId, {
      action: 'set_schedule_time',
      scheduleId: options.scheduleId,
      pendingPeriodicity: options.pendingPeriodicity,
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
