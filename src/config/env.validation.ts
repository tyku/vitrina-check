import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).optional(),
  PORT: z.coerce.number().int().min(1).max(65535).optional(),
  MONGO_URI: z.string().min(1),
  REDIS_URL: z.url().optional(),
  REDIS_PASSWORD: z.string().min(1).optional(),
  PLAYWRIGHT_USER_AGENT: z.string().min(1).optional(),
  PLAYWRIGHT_RETRY_COUNT_DEFAULT: z.coerce
    .number()
    .int()
    .min(0)
    .max(10)
    .optional(),
  PLAYWRIGHT_NAVIGATION_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .min(5000)
    .max(180000)
    .optional(),
  PLAYWRIGHT_NETWORK_IDLE_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .min(500)
    .max(120000)
    .optional(),
  PLAYWRIGHT_STABILIZE_DELAY_MS: z.coerce
    .number()
    .int()
    .min(0)
    .max(60000)
    .optional(),
  PLAYWRIGHT_RESTART_EVERY: z.coerce
    .number()
    .int()
    .min(1)
    .max(10000)
    .optional(),
  PLAYWRIGHT_MAX_CONCURRENCY: z.coerce.number().int().min(1).max(32).optional(),
  DISPATCH_SCHEDULER_POLL_INTERVAL_MINUTES: z.coerce
    .number()
    .int()
    .min(1)
    .max(1440)
    .optional(),
  DISPATCH_PARSER_POLL_INTERVAL_MINUTES: z.coerce
    .number()
    .int()
    .min(1)
    .max(1440)
    .optional(),
  TELEGRAM_WEBHOOK_SECRET_TOKEN: z.string().min(1).optional(),
  TELEGRAM_WEBHOOK_PATH_SECRET: z.string().min(1).optional(),
  TELEGRAM_WEBHOOK_SECRET_HEADER_NAME: z.string().min(1).optional(),
  TELEGRAM_WEBHOOK_MAX_BODY_BYTES: z.coerce
    .number()
    .int()
    .min(1024)
    .max(20 * 1024 * 1024)
    .optional(),
  TELEGRAM_WEBHOOK_REQUEST_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .min(0)
    .max(120_000)
    .optional(),
  TELEGRAM_WEBHOOK_LOG_SUMMARY: z.enum(['true', 'false']).optional(),
  TELEGRAM_BOT_ID: z.string().min(1).max(64).optional(),
  TELEGRAM_WEBHOOK_DEDUPE_TTL_SECONDS: z.coerce
    .number()
    .int()
    .min(60)
    .max(604800)
    .optional(),
  TELEGRAM_CALLBACK_DEDUPE_ENABLED: z.enum(['true', 'false']).optional(),
  TELEGRAM_CALLBACK_DEDUPE_TTL_SECONDS: z.coerce
    .number()
    .int()
    .min(30)
    .max(3600)
    .optional(),
  TELEGRAM_BOT_TOKEN: z.string().min(1).optional(),
  TELEGRAM_OUTBOUND_GLOBAL_RATE_PER_SEC: z.coerce
    .number()
    .min(1)
    .max(50)
    .optional(),
  TELEGRAM_OUTBOUND_GLOBAL_BURST: z.coerce.number().min(1).max(100).optional(),
  TELEGRAM_OUTBOUND_CHAT_RATE_PER_SEC: z.coerce
    .number()
    .min(0.1)
    .max(10)
    .optional(),
  TELEGRAM_OUTBOUND_CHAT_BURST: z.coerce.number().min(1).max(20).optional(),
  TELEGRAM_OUTBOUND_429_DEFAULT_RETRY_SECONDS: z.coerce
    .number()
    .int()
    .min(1)
    .max(3600)
    .optional(),
  TELEGRAM_OUTBOUND_429_MAX_ROUNDS: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .optional(),
  TELEGRAM_OUTBOUND_429_MAX_WAIT_MS: z.coerce
    .number()
    .int()
    .min(1000)
    .max(86_400_000)
    .optional(),
});

export function validate(config: Record<string, unknown>) {
  return EnvSchema.parse(config);
}
