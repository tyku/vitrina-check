import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { TelegramWebhookController } from './telegram-webhook.controller';
import { TelegramWebhookAuthService } from './telegram-webhook-auth.service';
import { TelegramWebhookInboundService } from './telegram-webhook-inbound.service';
import { TelegramWebhookLimitsInterceptor } from './telegram-webhook-limits.interceptor';

const HEADER_DEFAULT = 'x-telegram-bot-api-secret-token';
const HEADER_TOKEN = 'h'.repeat(32);
const PATH_TOKEN = 'p'.repeat(24);

type TelegramCfg = {
  nodeEnv: string;
  telegram: {
    webhookSecretHeaderName: string;
    webhookSecretToken?: string;
    webhookPathSecret?: string;
    webhookMaxBodyBytes?: number;
    webhookRequestTimeoutMs?: number;
    webhookLogSummary?: boolean;
  };
};

function withTelegramDefaults(
  t: TelegramCfg['telegram'],
): TelegramCfg['telegram'] {
  return {
    webhookMaxBodyBytes: 524288,
    webhookRequestTimeoutMs: 0,
    webhookLogSummary: false,
    ...t,
  };
}

async function bootstrapWithConfig(
  cfg: TelegramCfg,
  enqueueWebhookUpdate: jest.Mock,
): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        ignoreEnvFile: true,
        load: [
          () => ({
            nodeEnv: cfg.nodeEnv,
            telegram: withTelegramDefaults(cfg.telegram),
          }),
        ],
      }),
    ],
    controllers: [TelegramWebhookController],
    providers: [
      TelegramWebhookAuthService,
      TelegramWebhookLimitsInterceptor,
      {
        provide: TelegramWebhookInboundService,
        useValue: { enqueueWebhookUpdate },
      },
    ],
  }).compile();

  const app = moduleFixture.createNestApplication();
  await app.init();
  return app;
}

describe('TelegramWebhookController', () => {
  let app: INestApplication;
  let enqueueMock: jest.Mock;

  beforeEach(() => {
    enqueueMock = jest.fn().mockResolvedValue(undefined);
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('development, no secrets', () => {
    beforeEach(async () => {
      app = await bootstrapWithConfig(
        {
          nodeEnv: 'development',
          telegram: {
            webhookSecretHeaderName: HEADER_DEFAULT,
          },
        },
        enqueueMock,
      );
    });

    it('POST /telegram/webhook returns 200 without auth and enqueues body', async () => {
      const body = { update_id: 1 };
      await request(app.getHttpServer())
        .post('/telegram/webhook')
        .send(body)
        .expect(200);
      expect(enqueueMock).toHaveBeenCalledTimes(1);
      expect(enqueueMock).toHaveBeenCalledWith(body);
    });
  });

  describe('production, no secrets', () => {
    beforeEach(async () => {
      app = await bootstrapWithConfig(
        {
          nodeEnv: 'production',
          telegram: {
            webhookSecretHeaderName: HEADER_DEFAULT,
          },
        },
        enqueueMock,
      );
    });

    it('POST /telegram/webhook returns 401 and does not enqueue', async () => {
      await request(app.getHttpServer())
        .post('/telegram/webhook')
        .send({})
        .expect(401);
      expect(enqueueMock).not.toHaveBeenCalled();
    });
  });

  describe('header secret only', () => {
    beforeEach(async () => {
      app = await bootstrapWithConfig(
        {
          nodeEnv: 'production',
          telegram: {
            webhookSecretToken: HEADER_TOKEN,
            webhookSecretHeaderName: HEADER_DEFAULT,
          },
        },
        enqueueMock,
      );
    });

    it('200 with correct header on /telegram/webhook', async () => {
      const body = { update_id: 2 };
      await request(app.getHttpServer())
        .post('/telegram/webhook')
        .set(HEADER_DEFAULT, HEADER_TOKEN)
        .send(body)
        .expect(200);
      expect(enqueueMock).toHaveBeenCalledWith(body);
    });

    it('401 wrong header value', async () => {
      await request(app.getHttpServer())
        .post('/telegram/webhook')
        .set(HEADER_DEFAULT, 'x'.repeat(32))
        .send({})
        .expect(401);
      expect(enqueueMock).not.toHaveBeenCalled();
    });

    it('401 missing header', async () => {
      await request(app.getHttpServer())
        .post('/telegram/webhook')
        .send({})
        .expect(401);
      expect(enqueueMock).not.toHaveBeenCalled();
    });

    it('200 with correct header on /telegram/webhook/extra path (path not required)', async () => {
      const body = { update_id: 9 };
      await request(app.getHttpServer())
        .post('/telegram/webhook/extra-segment')
        .set(HEADER_DEFAULT, HEADER_TOKEN)
        .send(body)
        .expect(200);
      expect(enqueueMock).toHaveBeenCalledWith(body);
    });
  });

  describe('path secret only', () => {
    beforeEach(async () => {
      app = await bootstrapWithConfig(
        {
          nodeEnv: 'production',
          telegram: {
            webhookPathSecret: PATH_TOKEN,
            webhookSecretHeaderName: HEADER_DEFAULT,
          },
        },
        enqueueMock,
      );
    });

    it('200 when path segment matches', async () => {
      const body = { update_id: 3 };
      await request(app.getHttpServer())
        .post(`/telegram/webhook/${PATH_TOKEN}`)
        .send(body)
        .expect(200);
      expect(enqueueMock).toHaveBeenCalledWith(body);
    });

    it('401 when path segment wrong', async () => {
      await request(app.getHttpServer())
        .post('/telegram/webhook/wrong-wrong-wrong-wrong')
        .send({})
        .expect(401);
      expect(enqueueMock).not.toHaveBeenCalled();
    });

    it('401 when POST /telegram/webhook without segment', async () => {
      await request(app.getHttpServer())
        .post('/telegram/webhook')
        .send({})
        .expect(401);
      expect(enqueueMock).not.toHaveBeenCalled();
    });
  });

  describe('header + path both required', () => {
    beforeEach(async () => {
      app = await bootstrapWithConfig(
        {
          nodeEnv: 'production',
          telegram: {
            webhookSecretToken: HEADER_TOKEN,
            webhookPathSecret: PATH_TOKEN,
            webhookSecretHeaderName: HEADER_DEFAULT,
          },
        },
        enqueueMock,
      );
    });

    it('200 when both match', async () => {
      const body = { update_id: 4 };
      await request(app.getHttpServer())
        .post(`/telegram/webhook/${PATH_TOKEN}`)
        .set(HEADER_DEFAULT, HEADER_TOKEN)
        .send(body)
        .expect(200);
      expect(enqueueMock).toHaveBeenCalledWith(body);
    });

    it('401 correct path, wrong header', async () => {
      await request(app.getHttpServer())
        .post(`/telegram/webhook/${PATH_TOKEN}`)
        .set(HEADER_DEFAULT, 'z'.repeat(32))
        .send({})
        .expect(401);
      expect(enqueueMock).not.toHaveBeenCalled();
    });

    it('401 correct header, wrong path', async () => {
      await request(app.getHttpServer())
        .post('/telegram/webhook/not-the-path')
        .set(HEADER_DEFAULT, HEADER_TOKEN)
        .send({})
        .expect(401);
      expect(enqueueMock).not.toHaveBeenCalled();
    });

    it('401 correct header, no path segment', async () => {
      await request(app.getHttpServer())
        .post('/telegram/webhook')
        .set(HEADER_DEFAULT, HEADER_TOKEN)
        .send({})
        .expect(401);
      expect(enqueueMock).not.toHaveBeenCalled();
    });
  });

  describe('custom webhook secret header name', () => {
    const customHeader = 'x-telegram-custom-secret';

    beforeEach(async () => {
      app = await bootstrapWithConfig(
        {
          nodeEnv: 'production',
          telegram: {
            webhookSecretToken: HEADER_TOKEN,
            webhookSecretHeaderName: customHeader,
          },
        },
        enqueueMock,
      );
    });

    it('200 with value in custom header', async () => {
      const body = { update_id: 5 };
      await request(app.getHttpServer())
        .post('/telegram/webhook')
        .set(customHeader, HEADER_TOKEN)
        .send(body)
        .expect(200);
      expect(enqueueMock).toHaveBeenCalledWith(body);
    });

    it('401 when only default telegram header set', async () => {
      await request(app.getHttpServer())
        .post('/telegram/webhook')
        .set(HEADER_DEFAULT, HEADER_TOKEN)
        .send({})
        .expect(401);
      expect(enqueueMock).not.toHaveBeenCalled();
    });
  });

  describe('E1.3 payload size limit', () => {
    beforeEach(async () => {
      app = await bootstrapWithConfig(
        {
          nodeEnv: 'development',
          telegram: {
            webhookSecretHeaderName: HEADER_DEFAULT,
            webhookMaxBodyBytes: 80,
          },
        },
        enqueueMock,
      );
    });

    it('413 when JSON body exceeds max and does not enqueue', async () => {
      await request(app.getHttpServer())
        .post('/telegram/webhook')
        .send({ update_id: 1, pad: 'y'.repeat(200) })
        .expect(413);
      expect(enqueueMock).not.toHaveBeenCalled();
    });
  });
});
