import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { TelegramWebhookAuthService } from './telegram-webhook-auth.service';

describe('TelegramWebhookAuthService', () => {
  function createService(config: Record<string, string | undefined>) {
    return new TelegramWebhookAuthService({
      get: (key: string) => config[key] as string | undefined,
    } as ConfigService);
  }

  it('development: allows when no secrets configured', () => {
    const svc = createService({ nodeEnv: 'development' });
    expect(() => svc.assertWebhookAuthorized(undefined, undefined)).not.toThrow();
  });

  it('production: rejects when no secrets configured', () => {
    const svc = createService({ nodeEnv: 'production' });
    expect(() => svc.assertWebhookAuthorized(undefined, undefined)).toThrow(
      UnauthorizedException,
    );
  });

  it('accepts matching header secret only', () => {
    const svc = createService({
      nodeEnv: 'production',
      'telegram.webhookSecretToken': 'a'.repeat(32),
    });
    expect(() =>
      svc.assertWebhookAuthorized(undefined, 'a'.repeat(32)),
    ).not.toThrow();
    expect(() =>
      svc.assertWebhookAuthorized(undefined, 'wrong'.padEnd(32, '0')),
    ).toThrow(UnauthorizedException);
    expect(() => svc.assertWebhookAuthorized(undefined, undefined)).toThrow(
      UnauthorizedException,
    );
  });

  it('accepts matching path secret only', () => {
    const secret = 'path-' + 'b'.repeat(24);
    const svc = createService({
      nodeEnv: 'production',
      'telegram.webhookPathSecret': secret,
    });
    expect(() => svc.assertWebhookAuthorized(secret, undefined)).not.toThrow();
    expect(() =>
      svc.assertWebhookAuthorized(secret + 'x', undefined),
    ).toThrow(UnauthorizedException);
  });

  it('requires both when both configured', () => {
    const svc = createService({
      nodeEnv: 'production',
      'telegram.webhookSecretToken': 'h'.repeat(16),
      'telegram.webhookPathSecret': 'p'.repeat(16),
    });
    expect(() =>
      svc.assertWebhookAuthorized('p'.repeat(16), 'h'.repeat(16)),
    ).not.toThrow();
    expect(() =>
      svc.assertWebhookAuthorized('p'.repeat(16), 'wrongwrongwrong'),
    ).toThrow(UnauthorizedException);
    expect(() =>
      svc.assertWebhookAuthorized('wrongwrongwrong', 'h'.repeat(16)),
    ).toThrow(UnauthorizedException);
  });

  it('rejects wrong length header without leaking via timingSafeEqual', () => {
    const svc = createService({
      nodeEnv: 'production',
      'telegram.webhookSecretToken': 'short',
    });
    expect(() =>
      svc.assertWebhookAuthorized(undefined, 'different'),
    ).toThrow(UnauthorizedException);
  });
});

describe('TelegramWebhookAuthService (integration)', () => {
  let moduleRef: TestingModule;
  let svc: TelegramWebhookAuthService;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      providers: [
        TelegramWebhookAuthService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) =>
              ({
                nodeEnv: 'test',
                'telegram.webhookSecretToken': 'tok',
                'telegram.webhookPathSecret': undefined,
              })[key],
          },
        },
      ],
    }).compile();
    svc = moduleRef.get(TelegramWebhookAuthService);
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  it('module provides service', () => {
    expect(svc).toBeDefined();
  });
});
