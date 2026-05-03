import type Redis from 'ioredis';

/** Injected Redis client dedicated to webhook dedup (E2.1). */
export const TELEGRAM_WEBHOOK_DEDUP_REDIS = Symbol('TELEGRAM_WEBHOOK_DEDUP_REDIS');

export function telegramWebhookDedupKey(botId: string, updateId: number): string {
  return `telegram:webhook:dedup:v1:${botId}:${updateId}`;
}

export function telegramCallbackDedupKey(
  botId: string,
  callbackQueryId: string,
): string {
  return `telegram:webhook:callback:v1:${botId}:${callbackQueryId}`;
}

/** Narrow type for tests (mock `set` / `quit`). */
export type TelegramWebhookDedupRedisClient = Pick<Redis, 'set' | 'quit'>;
