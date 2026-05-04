export default () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  database: {
    uri: process.env.MONGO_URI || 'mongodb://localhost:27017/vitrina-check',
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    password: process.env.REDIS_PASSWORD,
  },
  playwright: {
    userAgent:
      process.env.PLAYWRIGHT_USER_AGENT ??
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    retryCountDefault:
      parseInt(process.env.PLAYWRIGHT_RETRY_COUNT_DEFAULT || '1', 10) || 1,
    navigationTimeoutMs:
      parseInt(process.env.PLAYWRIGHT_NAVIGATION_TIMEOUT_MS || '60000', 10) ||
      60000,
    networkIdleTimeoutMs:
      parseInt(process.env.PLAYWRIGHT_NETWORK_IDLE_TIMEOUT_MS || '10000', 10) ||
      10000,
    stabilizeDelayMs:
      parseInt(process.env.PLAYWRIGHT_STABILIZE_DELAY_MS || '1200', 10) || 1200,
    restartEvery:
      parseInt(process.env.PLAYWRIGHT_RESTART_EVERY || '100', 10) || 100,
    maxConcurrency:
      parseInt(process.env.PLAYWRIGHT_MAX_CONCURRENCY || '2', 10) || 2,
  },
  dispatchScheduler: {
    pollIntervalMinutes: 1,
  },
  dispatchParser: {
    pollIntervalMinutes:
      parseInt(process.env.DISPATCH_PARSER_POLL_INTERVAL_MINUTES || '1', 10) ||
      1,
  },
  telegram: {
    webhookSecretToken: process.env.TELEGRAM_WEBHOOK_SECRET_TOKEN,
    webhookPathSecret: process.env.TELEGRAM_WEBHOOK_PATH_SECRET,
    /** Telegram Bot API: header present when `secret_token` was set in setWebhook. */
    webhookSecretHeaderName: (
      process.env.TELEGRAM_WEBHOOK_SECRET_HEADER_NAME?.trim() ||
      'x-telegram-bot-api-secret-token'
    ).toLowerCase(),
    /** Max JSON body (UTF-8 bytes) after parse; Telegram updates are usually small. */
    webhookMaxBodyBytes: (() => {
      const n = parseInt(
        process.env.TELEGRAM_WEBHOOK_MAX_BODY_BYTES || '524288',
        10,
      );
      return Number.isFinite(n) && n >= 1024 ? n : 524288;
    })(),
    /** 0 = leave socket default. */
    webhookRequestTimeoutMs: (() => {
      const raw = process.env.TELEGRAM_WEBHOOK_REQUEST_TIMEOUT_MS;
      if (raw === undefined || raw.trim() === '') {
        return 0;
      }
      const n = parseInt(raw, 10);
      return Number.isFinite(n) && n >= 0 ? n : 0;
    })(),
    /** If true, logs only `summarizeTelegramUpdateForLog` (no PII fields). */
    webhookLogSummary:
      (process.env.TELEGRAM_WEBHOOK_LOG_SUMMARY ?? '').toLowerCase() === 'true',
    /** Namespace for Redis dedup keys (E2.1); default if unset. */
    botId: process.env.TELEGRAM_BOT_ID?.trim() || undefined,
    webhookDedupeTtlSeconds: (() => {
      const raw = process.env.TELEGRAM_WEBHOOK_DEDUPE_TTL_SECONDS;
      if (raw === undefined || raw.trim() === '') {
        return 86400;
      }
      const n = parseInt(raw, 10);
      return Number.isFinite(n) && n >= 60 && n <= 604800 ? n : 86400;
    })(),
    /** E2.2: optional second dedup layer for `callback_query.id` (short TTL). */
    callbackDedupeEnabled:
      (process.env.TELEGRAM_CALLBACK_DEDUPE_ENABLED ?? '').toLowerCase() ===
      'true',
    callbackDedupeTtlSeconds: (() => {
      const raw = process.env.TELEGRAM_CALLBACK_DEDUPE_TTL_SECONDS;
      if (raw === undefined || raw.trim() === '') {
        return 300;
      }
      const n = parseInt(raw, 10);
      return Number.isFinite(n) && n >= 30 && n <= 3600 ? n : 300;
    })(),
    /** Bot API token for outbound calls (optional until integration tests use mock). */
    botToken: process.env.TELEGRAM_BOT_TOKEN?.trim() || undefined,
    /** E3.2: sustained global sends per second (~Bot API ~30/s cap; default 22). */
    outboundGlobalRatePerSec: (() => {
      const n = parseFloat(
        process.env.TELEGRAM_OUTBOUND_GLOBAL_RATE_PER_SEC ?? '22',
      );
      return Number.isFinite(n) && n >= 1 && n <= 50 ? n : 22;
    })(),
    /** E3.2: max burst tokens for global bucket. */
    outboundGlobalBurst: (() => {
      const n = parseFloat(process.env.TELEGRAM_OUTBOUND_GLOBAL_BURST ?? '25');
      return Number.isFinite(n) && n >= 1 && n <= 100 ? n : 25;
    })(),
    /** E3.2: sustained per-chat sends per second. */
    outboundChatRatePerSec: (() => {
      const n = parseFloat(
        process.env.TELEGRAM_OUTBOUND_CHAT_RATE_PER_SEC ?? '1',
      );
      return Number.isFinite(n) && n >= 0.1 && n <= 10 ? n : 1;
    })(),
    /** E3.2: per-chat burst (quick double-send tolerance). */
    outboundChatBurst: (() => {
      const n = parseFloat(process.env.TELEGRAM_OUTBOUND_CHAT_BURST ?? '2');
      return Number.isFinite(n) && n >= 1 && n <= 20 ? n : 2;
    })(),
  },
});
