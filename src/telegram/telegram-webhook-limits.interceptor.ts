import {
  BadRequestException,
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
  PayloadTooLargeException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { summarizeTelegramUpdateForLog } from './telegram-update-log-summary';

@Injectable()
export class TelegramWebhookLimitsInterceptor implements NestInterceptor {
  private readonly logger = new Logger(TelegramWebhookLimitsInterceptor.name);

  constructor(private readonly configService: ConfigService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    const maxBytes =
      this.configService.get<number>('telegram.webhookMaxBodyBytes') ??
      512 * 1024;
    const timeoutMs =
      this.configService.get<number>('telegram.webhookRequestTimeoutMs') ?? 0;
    const logSummary =
      this.configService.get<boolean>('telegram.webhookLogSummary') ?? false;

    let byteLength: number;
    try {
      byteLength = Buffer.byteLength(
        JSON.stringify(req.body ?? null),
        'utf8',
      );
    } catch {
      throw new BadRequestException('Invalid JSON body');
    }

    if (byteLength > maxBytes) {
      throw new PayloadTooLargeException();
    }

    const socket = req.socket;
    let previousTimeoutMs: number | undefined;
    if (timeoutMs > 0 && socket) {
      previousTimeoutMs = socket.timeout;
      socket.setTimeout(timeoutMs);
    }

    if (logSummary) {
      this.logger.log(
        `telegram webhook ${JSON.stringify(summarizeTelegramUpdateForLog(req.body))}`,
      );
    }

    return next.handle().pipe(
      finalize(() => {
        if (timeoutMs > 0 && socket) {
          socket.setTimeout(previousTimeoutMs ?? 0);
        }
      }),
    );
  }
}
