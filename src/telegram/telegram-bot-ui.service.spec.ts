import { Test, TestingModule } from '@nestjs/testing';
import { Job } from 'bullmq';
import { UserService } from '../user/user.service';
import { TG_CB_MENU_VITRINY } from './telegram-bot-ui.constants';
import {
  normalizeBotCommand,
  TelegramBotUiService,
} from './telegram-bot-ui.service';
import { TelegramOutboundService } from './telegram-outbound.service';

type EnqueuePayload = {
  method: string;
  params: Record<string, unknown>;
  correlationId?: string;
};

describe('normalizeBotCommand', () => {
  it('strips bot suffix and lowercases', () => {
    expect(normalizeBotCommand('/Start@MyBot args')).toBe('/start');
    expect(normalizeBotCommand('/HELP')).toBe('/help');
  });

  it('returns undefined for plain text', () => {
    expect(normalizeBotCommand('hello')).toBeUndefined();
  });
});

describe('TelegramBotUiService', () => {
  let service: TelegramBotUiService;
  let outbound: { enqueueApiCall: jest.Mock };
  let users: { ensureTelegramUser: jest.Mock };

  beforeEach(async () => {
    outbound = { enqueueApiCall: jest.fn().mockResolvedValue(undefined) };
    users = {
      ensureTelegramUser: jest.fn().mockResolvedValue({
        id: 'u1',
        userId: '42',
        sourceType: 'tg',
      }),
    };
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        TelegramBotUiService,
        { provide: TelegramOutboundService, useValue: outbound },
        { provide: UserService, useValue: users },
      ],
    }).compile();
    service = moduleRef.get(TelegramBotUiService);
  });

  it('enqueues sendMessage with menu on /start', async () => {
    await service.handleInboundJob({
      id: 'j1',
      data: {
        raw: {
          update_id: 1,
          message: {
            message_id: 10,
            chat: { id: 100 },
            from: { id: 42 },
            text: '/start',
          },
        },
      },
    } as Job<{ raw?: unknown }>);
    expect(users.ensureTelegramUser).toHaveBeenCalled();
    const calls = outbound.enqueueApiCall.mock.calls as unknown as Array<
      [EnqueuePayload]
    >;
    const payloads = calls.map((c) => c[0]);
    const firstArg = payloads[0];
    expect(firstArg?.method).toBe('sendMessage');
    expect(firstArg?.correlationId).toContain('in:1:j1');
    const params = firstArg?.params ?? {};
    expect(params.chat_id).toBe('100');
    expect(params.reply_markup).toBeDefined();
  });

  it('handles callback with stub message', async () => {
    await service.handleInboundJob({
      id: 'j2',
      data: {
        raw: {
          update_id: 2,
          callback_query: {
            id: 'cb1',
            from: { id: 42 },
            message: { message_id: 3, chat: { id: 100 } },
            data: TG_CB_MENU_VITRINY,
          },
        },
      },
    } as Job<{ raw?: unknown }>);
    expect(outbound.enqueueApiCall).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'answerCallbackQuery' }),
    );
    expect(outbound.enqueueApiCall).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'sendMessage',
        params: expect.objectContaining({
          text: expect.stringContaining('Витрины') as string,
        }) as Record<string, unknown>,
      }),
    );
  });
});
