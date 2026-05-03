import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { TelegramModule } from './telegram.module';

const HEADER_DEFAULT = 'x-telegram-bot-api-secret-token';
const HEADER_TOKEN = 'h'.repeat(32);
const PATH_TOKEN = 'p'.repeat(24);

type TelegramConfig = {
  nodeEnv: string;
  telegram: {
    webhookSecretToken?: string;
    webhookPathSecret?: string;
    webhookSecretHeaderName: string;
  };
};

async function bootstrapWithConfig(
  cfg: TelegramConfig,
): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        ignoreEnvFile: true,
        load: [() => cfg],
      }),
      TelegramModule,
    ],
  }).compile();

  const app = moduleFixture.createNestApplication();
  await app.init();
  return app;
}

describe('TelegramWebhookController', () => {
  let app: INestApplication;

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('development, no secrets', () => {
    beforeEach(async () => {
      app = await bootstrapWithConfig({
        nodeEnv: 'development',
        telegram: {
          webhookSecretHeaderName: HEADER_DEFAULT,
        },
      });
    });

    it('POST /telegram/webhook returns 200 without auth', async () => {
      await request(app.getHttpServer())
        .post('/telegram/webhook')
        .send({ update_id: 1 })
        .expect(200);
    });
  });

  describe('production, no secrets', () => {
    beforeEach(async () => {
      app = await bootstrapWithConfig({
        nodeEnv: 'production',
        telegram: {
          webhookSecretHeaderName: HEADER_DEFAULT,
        },
      });
    });

    it('POST /telegram/webhook returns 401', async () => {
      await request(app.getHttpServer())
        .post('/telegram/webhook')
        .send({})
        .expect(401);
    });
  });

  describe('header secret only', () => {
    beforeEach(async () => {
      app = await bootstrapWithConfig({
        nodeEnv: 'production',
        telegram: {
          webhookSecretToken: HEADER_TOKEN,
          webhookSecretHeaderName: HEADER_DEFAULT,
        },
      });
    });

    it('200 with correct header on /telegram/webhook', async () => {
      await request(app.getHttpServer())
        .post('/telegram/webhook')
        .set(HEADER_DEFAULT, HEADER_TOKEN)
        .send({ update_id: 2 })
        .expect(200);
    });

    it('401 wrong header value', async () => {
      await request(app.getHttpServer())
        .post('/telegram/webhook')
        .set(HEADER_DEFAULT, 'x'.repeat(32))
        .send({})
        .expect(401);
    });

    it('401 missing header', async () => {
      await request(app.getHttpServer()).post('/telegram/webhook').send({}).expect(401);
    });

    it('200 with correct header on /telegram/webhook/extra path (path not required)', async () => {
      await request(app.getHttpServer())
        .post('/telegram/webhook/extra-segment')
        .set(HEADER_DEFAULT, HEADER_TOKEN)
        .send({})
        .expect(200);
    });
  });

  describe('path secret only', () => {
    beforeEach(async () => {
      app = await bootstrapWithConfig({
        nodeEnv: 'production',
        telegram: {
          webhookPathSecret: PATH_TOKEN,
          webhookSecretHeaderName: HEADER_DEFAULT,
        },
      });
    });

    it('200 when path segment matches', async () => {
      await request(app.getHttpServer())
        .post(`/telegram/webhook/${PATH_TOKEN}`)
        .send({ update_id: 3 })
        .expect(200);
    });

    it('401 when path segment wrong', async () => {
      await request(app.getHttpServer())
        .post('/telegram/webhook/wrong-wrong-wrong-wrong')
        .send({})
        .expect(401);
    });

    it('401 when POST /telegram/webhook without segment', async () => {
      await request(app.getHttpServer())
        .post('/telegram/webhook')
        .send({})
        .expect(401);
    });
  });

  describe('header + path both required', () => {
    beforeEach(async () => {
      app = await bootstrapWithConfig({
        nodeEnv: 'production',
        telegram: {
          webhookSecretToken: HEADER_TOKEN,
          webhookPathSecret: PATH_TOKEN,
          webhookSecretHeaderName: HEADER_DEFAULT,
        },
      });
    });

    it('200 when both match', async () => {
      await request(app.getHttpServer())
        .post(`/telegram/webhook/${PATH_TOKEN}`)
        .set(HEADER_DEFAULT, HEADER_TOKEN)
        .send({})
        .expect(200);
    });

    it('401 correct path, wrong header', async () => {
      await request(app.getHttpServer())
        .post(`/telegram/webhook/${PATH_TOKEN}`)
        .set(HEADER_DEFAULT, 'z'.repeat(32))
        .send({})
        .expect(401);
    });

    it('401 correct header, wrong path', async () => {
      await request(app.getHttpServer())
        .post('/telegram/webhook/not-the-path')
        .set(HEADER_DEFAULT, HEADER_TOKEN)
        .send({})
        .expect(401);
    });

    it('401 correct header, no path segment', async () => {
      await request(app.getHttpServer())
        .post('/telegram/webhook')
        .set(HEADER_DEFAULT, HEADER_TOKEN)
        .send({})
        .expect(401);
    });
  });

  describe('custom webhook secret header name', () => {
    const customHeader = 'x-telegram-custom-secret';

    beforeEach(async () => {
      app = await bootstrapWithConfig({
        nodeEnv: 'production',
        telegram: {
          webhookSecretToken: HEADER_TOKEN,
          webhookSecretHeaderName: customHeader,
        },
      });
    });

    it('200 with value in custom header', async () => {
      await request(app.getHttpServer())
        .post('/telegram/webhook')
        .set(customHeader, HEADER_TOKEN)
        .send({})
        .expect(200);
    });

    it('401 when only default telegram header set', async () => {
      await request(app.getHttpServer())
        .post('/telegram/webhook')
        .set(HEADER_DEFAULT, HEADER_TOKEN)
        .send({})
        .expect(401);
    });
  });
});
