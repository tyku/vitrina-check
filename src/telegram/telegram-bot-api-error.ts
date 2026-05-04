import { z } from 'zod';

/** Telegram Bot API error JSON often includes `parameters.retry_after` (seconds) on 429. */
const TelegramErrorBodySchema = z
  .object({
    parameters: z
      .object({
        retry_after: z.number().nonnegative(),
      })
      .optional(),
  })
  .passthrough();

/**
 * Reads `retry_after` from a Telegram error JSON body (seconds).
 * On parse failure uses `fallbackSeconds` (clamped 1..86400).
 */
export function parseRetryAfterSecondsFromTelegramBody(
  bodyText: string,
  fallbackSeconds: number,
): number {
  try {
    const json: unknown = JSON.parse(bodyText);
    const parsed = TelegramErrorBodySchema.safeParse(json);
    const ra = parsed.success ? parsed.data.parameters?.retry_after : undefined;
    if (typeof ra === 'number' && Number.isFinite(ra) && ra >= 0) {
      return clampRetrySeconds(ra);
    }
  } catch {
    // non-JSON body
  }
  return clampRetrySeconds(fallbackSeconds);
}

function clampRetrySeconds(sec: number): number {
  const s = Number.isFinite(sec) ? sec : 1;
  return Math.min(Math.max(Math.ceil(s), 1), 86400);
}
