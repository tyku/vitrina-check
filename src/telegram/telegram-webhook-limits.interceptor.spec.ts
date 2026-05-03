import {
  BadRequestException,
  CallHandler,
  ExecutionContext,
  PayloadTooLargeException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { of } from 'rxjs';
import { TelegramWebhookLimitsInterceptor } from './telegram-webhook-limits.interceptor';

function makeContext(body: unknown): ExecutionContext {
  const req = {
    body,
    socket: { setTimeout: jest.fn(), timeout: 0 as number },
  };
  return {
    switchToHttp: () => ({
      getRequest: () => req,
    }),
  } as ExecutionContext;
}

describe('TelegramWebhookLimitsInterceptor', () => {
  it('throws PayloadTooLarge when serialized body exceeds max', () => {
    const interceptor = new TelegramWebhookLimitsInterceptor({
      get: (k: string) =>
        (k === 'telegram.webhookMaxBodyBytes' ? 50 : undefined) as never,
    } as ConfigService);
    const ctx = makeContext({ update_id: 1, pad: 'x'.repeat(200) });
    expect(() =>
      interceptor.intercept(ctx, {
        handle: () => of(undefined),
      } as CallHandler),
    ).toThrow(PayloadTooLargeException);
  });

  it('allows small body', (done) => {
    const interceptor = new TelegramWebhookLimitsInterceptor({
      get: (k: string) => {
        if (k === 'telegram.webhookMaxBodyBytes') return 10240;
        if (k === 'telegram.webhookRequestTimeoutMs') return 0;
        if (k === 'telegram.webhookLogSummary') return false;
        return undefined as never;
      },
    } as ConfigService);
    const ctx = makeContext({ update_id: 1 });
    interceptor
      .intercept(ctx, { handle: () => of(undefined) } as CallHandler)
      .subscribe({
        complete: () => done(),
      });
  });

  it('throws BadRequest when body is not serializable', () => {
    const circular: Record<string, unknown> = { a: 1 };
    circular.self = circular;
    const interceptor = new TelegramWebhookLimitsInterceptor({
      get: () => 10240 as never,
    } as ConfigService);
    const ctx = makeContext(circular);
    expect(() =>
      interceptor.intercept(ctx, {
        handle: () => of(undefined),
      } as CallHandler),
    ).toThrow(BadRequestException);
  });
});
