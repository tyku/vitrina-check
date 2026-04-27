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
});

export function validate(config: Record<string, unknown>) {
  return EnvSchema.parse(config);
}
