import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'crypto';

function timingSafeStringEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) {
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

@Injectable()
export class TelegramWebhookAuthService {
  constructor(private readonly configService: ConfigService) {}

  /**
   * If `TELEGRAM_WEBHOOK_SECRET_TOKEN` is set — header must match.
   * If `TELEGRAM_WEBHOOK_PATH_SECRET` is set — path segment must match.
   * If both are set — both must match.
   * In production, at least one must be configured or every request is rejected.
   */
  assertWebhookAuthorized(
    pathSecret: string | undefined,
    headerSecret: string | undefined,
  ): void {
    const nodeEnv = this.configService.get<string>('nodeEnv') ?? 'development';
    const expectedHeader = this.configService.get<string>(
      'telegram.webhookSecretToken',
    );
    const expectedPath = this.configService.get<string>(
      'telegram.webhookPathSecret',
    );

    const hasHeader =
      typeof expectedHeader === 'string' && expectedHeader.length > 0;
    const hasPath = typeof expectedPath === 'string' && expectedPath.length > 0;

    if (!hasHeader && !hasPath) {
      if (nodeEnv === 'production') {
        throw new UnauthorizedException(
          'Telegram webhook secrets are not configured',
        );
      }
      return;
    }

    if (hasHeader) {
      if (
        headerSecret === undefined ||
        !timingSafeStringEqual(headerSecret, expectedHeader)
      ) {
        throw new UnauthorizedException();
      }
    }

    if (hasPath) {
      if (
        pathSecret === undefined ||
        !timingSafeStringEqual(pathSecret, expectedPath)
      ) {
        throw new UnauthorizedException();
      }
    }
  }
}
