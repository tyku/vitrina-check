import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type Redis from 'ioredis';
import { TELEGRAM_WEBHOOK_DEDUP_REDIS } from './telegram-webhook-dedup.constants';

/**
 * Atomic token-bucket for global + per-chat outbound rate (E3.2).
 * Redis KEYS[1]=global, KEYS[2]=chat (duplicate global if per-chat disabled).
 */
const OUTBOUND_RATE_LIMIT_LUA = `
local now = tonumber(ARGV[1])
local gr = tonumber(ARGV[2])
local gb = tonumber(ARGV[3])
local cr = tonumber(ARGV[4])
local cb = tonumber(ARGV[5])
local use_chat = tonumber(ARGV[6])

local function refill(key, rate, burst, now_ms)
  local h = redis.call('HMGET', key, 't', 'ts')
  local tv = tonumber(h[1])
  local tsv = tonumber(h[2])
  if not tv then
    tv = burst
    tsv = now_ms
  end
  local elapsed = math.max(0, (now_ms - tsv) / 1000)
  tv = math.min(burst, tv + elapsed * rate)
  return tv
end

local function save(key, t, now_ms)
  redis.call('HSET', key, 't', string.format('%.9f', t), 'ts', now_ms)
end

local gk = KEYS[1]
local gt = refill(gk, gr, gb, now)

if use_chat == 0 then
  if gt >= 1.0 then
    save(gk, gt - 1.0, now)
    return {0}
  end
  save(gk, gt, now)
  local delay = math.ceil((1.0 - gt) / gr * 1000)
  return {delay}
end

local ck = KEYS[2]
local ct = refill(ck, cr, cb, now)

if gt >= 1.0 and ct >= 1.0 then
  save(gk, gt - 1.0, now)
  save(ck, ct - 1.0, now)
  return {0}
end

save(gk, gt, now)
save(ck, ct, now)

local dg = (gt >= 1.0) and 0 or math.ceil((1.0 - gt) / gr * 1000)
local dc = (ct >= 1.0) and 0 or math.ceil((1.0 - ct) / cr * 1000)
local delay = math.max(dg, dc)
return {delay}
`;

export function outboundRateLimitGlobalKey(botId: string): string {
  return `telegram:outbound:tb:v1:${botId}:global`;
}

export function outboundRateLimitChatKey(
  botId: string,
  chatId: string,
): string {
  return `telegram:outbound:tb:v1:${botId}:chat:${chatId}`;
}

@Injectable()
export class TelegramOutboundRateLimitService {
  private readonly logger = new Logger(TelegramOutboundRateLimitService.name);

  constructor(
    @Inject(TELEGRAM_WEBHOOK_DEDUP_REDIS) private readonly redis: Redis,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Blocks until a token is taken from both global and (when `chatId` set) per-chat buckets.
   */
  async waitForOutboundSlot(
    chatId: string | undefined,
    correlationId?: string,
  ): Promise<void> {
    const botId =
      this.configService.get<string>('telegram.botId')?.trim() || 'default';
    const gr =
      this.configService.get<number>('telegram.outboundGlobalRatePerSec') ?? 22;
    const gb =
      this.configService.get<number>('telegram.outboundGlobalBurst') ?? 25;
    const cr =
      this.configService.get<number>('telegram.outboundChatRatePerSec') ?? 1;
    const cb =
      this.configService.get<number>('telegram.outboundChatBurst') ?? 2;
    const effectiveChatId =
      chatId !== undefined && chatId.length > 0 ? chatId : undefined;
    const useChat = effectiveChatId !== undefined ? 1 : 0;
    const gKey = outboundRateLimitGlobalKey(botId);
    const cKey =
      effectiveChatId !== undefined
        ? outboundRateLimitChatKey(botId, effectiveChatId)
        : gKey;

    const tag = correlationId ? ` cid=${correlationId}` : '';

    for (;;) {
      const now = Date.now();
      const raw = await this.redis.eval(
        OUTBOUND_RATE_LIMIT_LUA,
        2,
        gKey,
        cKey,
        String(now),
        String(gr),
        String(gb),
        String(cr),
        String(cb),
        String(useChat),
      );

      const delay = Array.isArray(raw) ? Number(raw[0]) : NaN;
      if (!Number.isFinite(delay)) {
        this.logger.error(
          `outbound rate limit script returned unexpected${tag}: ${JSON.stringify(raw)}`,
        );
        throw new Error(
          'Redis outbound rate limit script returned invalid value',
        );
      }
      if (delay === 0) {
        return;
      }
      const sleepMs = Math.min(Math.max(0, delay), 60_000);
      if (sleepMs > 0) {
        await new Promise((r) => setTimeout(r, sleepMs));
      }
    }
  }
}
