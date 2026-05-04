import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job, UnrecoverableError } from 'bullmq';
import { z } from 'zod';
import {
  TELEGRAM_OUTBOUND_JOB_API_CALL,
  TELEGRAM_OUTBOUND_QUEUE,
} from './telegram-outbound.constants';
import { parseRetryAfterSecondsFromTelegramBody } from './telegram-bot-api-error';
import { TelegramOutboundRateLimitService } from './telegram-outbound-rate-limit.service';

const OutboundJobDataSchema = z.object({
  method: z.string().min(1),
  params: z.record(z.string(), z.unknown()),
  correlationId: z.string().optional(),
});

export function extractOutboundChatId(
  params: Record<string, unknown>,
): string | undefined {
  const c = params.chat_id;
  if (c === undefined || c === null) {
    return undefined;
  }
  if (typeof c === 'string' || typeof c === 'number') {
    return String(c);
  }
  if (typeof c === 'bigint') {
    return c.toString();
  }
  return undefined;
}

@Processor(TELEGRAM_OUTBOUND_QUEUE, { concurrency: 8 })
export class TelegramOutboundProcessor extends WorkerHost {
  private readonly logger = new Logger(TelegramOutboundProcessor.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly rateLimit: TelegramOutboundRateLimitService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name !== TELEGRAM_OUTBOUND_JOB_API_CALL) {
      this.logger.warn(
        `skip outbound job unknown name=${job.name} id=${job.id?.toString() ?? 'n/a'}`,
      );
      throw new UnrecoverableError(`Unknown outbound job name: ${job.name}`);
    }

    const parsed = OutboundJobDataSchema.safeParse(job.data);
    if (!parsed.success) {
      throw new UnrecoverableError(
        `Invalid outbound job payload: ${parsed.error.message}`,
      );
    }
    const payload = parsed.data;

    await this.rateLimit.waitForOutboundSlot(
      extractOutboundChatId(payload.params),
      payload.correlationId,
    );

    const token = this.configService.get<string>('telegram.botToken');
    if (!token) {
      this.logger.warn(
        `TELEGRAM_BOT_TOKEN not set; outbound acknowledged without HTTP method=${payload.method} job=${job.id?.toString() ?? 'n/a'}`,
      );
      return;
    }

    await this.postTelegramBotApi(token, payload, job);
  }

  /**
   * POST JSON to Bot API; on 429 waits `retry_after` (or default) and retries until success or limits.
   */
  private async postTelegramBotApi(
    token: string,
    payload: z.infer<typeof OutboundJobDataSchema>,
    job: Job,
  ): Promise<void> {
    const url = `https://api.telegram.org/bot${token}/${payload.method}`;
    const defaultRetrySec =
      this.configService.get<number>(
        'telegram.outbound429DefaultRetrySeconds',
      ) ?? 5;
    const maxRounds =
      this.configService.get<number>('telegram.outbound429MaxRounds') ?? 30;
    const maxWaitMs =
      this.configService.get<number>('telegram.outbound429MaxWaitMs') ??
      3_600_000;

    for (let round = 0; round < maxRounds; round++) {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload.params),
      });
      const bodyText = await res.text();

      if (res.ok) {
        return;
      }

      if (res.status === 429) {
        const sec = parseRetryAfterSecondsFromTelegramBody(
          bodyText,
          defaultRetrySec,
        );
        const waitMs = Math.min(sec * 1000, maxWaitMs);
        this.logger.warn(
          `Telegram 429 ${payload.method} job=${job.id?.toString() ?? 'n/a'} round=${round + 1}/${maxRounds} retry_after=${sec}s sleep=${waitMs}ms`,
        );
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }

      throw new Error(
        `Telegram API ${res.status} for ${payload.method}: ${bodyText.slice(0, 500)}`,
      );
    }

    throw new Error(
      `Telegram 429: exceeded outbound429MaxRounds (${maxRounds}) for ${payload.method}`,
    );
  }
}
