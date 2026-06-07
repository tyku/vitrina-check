import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { UserService } from '../user/user.service';
import {
  TG_CB_MENU_REPORT,
  TG_CB_MENU_RUN,
  TG_CB_MENU_SCHEDULE,
  TG_CB_MENU_SUB,
  TG_CB_MENU_TAGS,
  TG_CB_MENU_VITRINY,
  TG_MAIN_MENU_CALLBACKS,
} from './telegram-bot-ui.constants';
import { isScheduleCallback } from './telegram-schedule-ui.constants';
import { isTagsCallback } from './telegram-tags-ui.constants';
import { isVitrinyCallback } from './telegram-vitriny-ui.constants';
import { TelegramOutboundService } from './telegram-outbound.service';
import { TelegramScheduleUiService } from './telegram-schedule-ui.service';
import { TelegramTagsUiService } from './telegram-tags-ui.service';
import { TelegramVitrinyUiService } from './telegram-vitriny-ui.service';
import {
  ParsedTelegramUpdate,
  TelegramUpdateSchema,
} from './telegram-update.schema';

function chatIdString(chat: { id: unknown }): string {
  const id = chat.id;
  if (typeof id === 'bigint') {
    return id.toString();
  }
  return String(id);
}

export function normalizeBotCommand(text: string): string | undefined {
  const t = text.trim();
  if (!t.startsWith('/')) {
    return undefined;
  }
  const first = t.split(/\s+/)[0];
  if (!first) {
    return undefined;
  }
  const cmd = first.split('@')[0];
  return cmd.toLowerCase();
}

function mainMenuReplyMarkup(): Record<string, unknown> {
  return {
    inline_keyboard: [
      [
        { text: 'Витрины', callback_data: TG_CB_MENU_VITRINY },
        { text: 'Метки', callback_data: TG_CB_MENU_TAGS },
        { text: 'Расписание', callback_data: TG_CB_MENU_SCHEDULE },
      ],
      [
        { text: 'Запуск', callback_data: TG_CB_MENU_RUN },
        { text: 'Отчёт', callback_data: TG_CB_MENU_REPORT },
        { text: 'Подписка', callback_data: TG_CB_MENU_SUB },
      ],
    ],
  };
}

@Injectable()
export class TelegramBotUiService {
  private readonly logger = new Logger(TelegramBotUiService.name);

  constructor(
    private readonly outbound: TelegramOutboundService,
    private readonly users: UserService,
    private readonly vitrinyUi: TelegramVitrinyUiService,
    private readonly tagsUi: TelegramTagsUiService,
    private readonly scheduleUi: TelegramScheduleUiService,
  ) {}

  /**
   * Handles one webhook job payload (`{ raw }`). Unknown shapes are logged and skipped.
   */
  async handleInboundJob(job: Job<{ raw?: unknown }>): Promise<void> {
    const raw = job.data?.raw;
    const parsed = TelegramUpdateSchema.safeParse(raw);
    if (!parsed.success) {
      this.logger.warn(
        `skip inbound job=${job.id?.toString() ?? 'n/a'}: ${parsed.error.message}`,
      );
      return;
    }
    const corr = `in:${String(parsed.data.update_id)}:${job.id?.toString() ?? 'na'}`;
    await this.dispatch(parsed.data, corr);
  }

  private async dispatch(
    update: ParsedTelegramUpdate,
    correlationId: string,
  ): Promise<void> {
    const cq = update.callback_query;
    if (cq?.from && cq.id) {
      await this.users.ensureTelegramUser(cq.from);
      await this.handleCallback(cq, correlationId);
      return;
    }

    const msg = update.message;
    const text = msg?.text;
    const from = msg?.from;
    const chat = msg?.chat;
    if (!text || !from || !chat) {
      return;
    }

    const user = await this.users.ensureTelegramUser(from);
    const telegramUserId = String(from.id);
    const cmd = normalizeBotCommand(text);
    const chatId = chatIdString(chat);

    if (!cmd) {
      const handledByVitriny = await this.vitrinyUi.handleTextMessage(
        text,
        chatId,
        user,
        telegramUserId,
        correlationId,
      );
      if (handledByVitriny) {
        return;
      }
      const handledByTags = await this.tagsUi.handleTextMessage(
        text,
        chatId,
        user,
        telegramUserId,
        correlationId,
      );
      if (handledByTags) {
        return;
      }
      const handledBySchedule = await this.scheduleUi.handleTextMessage(
        text,
        chatId,
        user,
        telegramUserId,
        correlationId,
      );
      if (handledBySchedule) {
        return;
      }
    }

    if (cmd === '/start') {
      await this.enqueueSendMessage({
        chat_id: chatId,
        text: 'Привет. Я помогу с витринами и проверками — выберите раздел в меню ниже.',
        reply_markup: mainMenuReplyMarkup(),
        correlationId,
      });
      return;
    }

    if (cmd === '/help') {
      await this.enqueueSendMessage({
        chat_id: chatId,
        text: 'Команды:\n/start — меню\n/help — это сообщение\n/status — статус бота и вашего аккаунта',
        correlationId,
      });
      return;
    }

    if (cmd === '/status') {
      await this.enqueueSendMessage({
        chat_id: chatId,
        text: `Бот работает. Ваш user id в базе: ${user.id}\nTelegram id: ${user.userId}`,
        correlationId,
      });
      return;
    }
  }

  private async handleCallback(
    cq: NonNullable<ParsedTelegramUpdate['callback_query']>,
    correlationId: string,
  ): Promise<void> {
    const data = cq.data?.trim() ?? '';
    const from = cq.from;
    if (!from) {
      return;
    }

    await this.enqueueAnswerCallbackQuery({
      callback_query_id: cq.id,
      correlationId,
    });

    const msg = cq.message;
    if (!msg) {
      return;
    }
    const chatId = chatIdString(msg.chat);
    const user = await this.users.ensureTelegramUser(from);
    const telegramUserId = String(from.id);

    if (data === TG_CB_MENU_TAGS || isTagsCallback(data)) {
      if (data === TG_CB_MENU_TAGS) {
        await this.tagsUi.showMenu(chatId, user, correlationId);
        return;
      }
      const tagsResult = await this.tagsUi.handleCallback(
        data,
        chatId,
        user,
        telegramUserId,
        correlationId,
      );
      if (tagsResult === 'back_main') {
        await this.enqueueSendMessage({
          chat_id: chatId,
          text: 'Главное меню:',
          reply_markup: mainMenuReplyMarkup(),
          correlationId,
        });
      }
      return;
    }

    if (data === TG_CB_MENU_VITRINY || isVitrinyCallback(data)) {
      if (data === TG_CB_MENU_VITRINY) {
        await this.vitrinyUi.showMenu(chatId, user, correlationId);
        return;
      }
      const vitrinyResult = await this.vitrinyUi.handleCallback(
        data,
        chatId,
        user,
        telegramUserId,
        correlationId,
      );
      if (vitrinyResult === 'back_main') {
        await this.enqueueSendMessage({
          chat_id: chatId,
          text: 'Главное меню:',
          reply_markup: mainMenuReplyMarkup(),
          correlationId,
        });
      }
      return;
    }

    if (data === TG_CB_MENU_SCHEDULE || isScheduleCallback(data)) {
      if (data === TG_CB_MENU_SCHEDULE) {
        await this.scheduleUi.showMenu(chatId, user, correlationId);
        return;
      }
      const scheduleResult = await this.scheduleUi.handleCallback(
        data,
        chatId,
        user,
        telegramUserId,
        correlationId,
      );
      if (scheduleResult === 'back_main') {
        await this.enqueueSendMessage({
          chat_id: chatId,
          text: 'Главное меню:',
          reply_markup: mainMenuReplyMarkup(),
          correlationId,
        });
      }
      return;
    }

    if (!TG_MAIN_MENU_CALLBACKS.has(data)) {
      await this.enqueueSendMessage({
        chat_id: chatId,
        text: 'Неизвестная кнопка — попробуйте /start.',
        correlationId,
      });
      return;
    }

    const stubs: Record<string, string> = {
      [TG_CB_MENU_RUN]: 'Запуск проверки — скоро будет доступен.',
      [TG_CB_MENU_REPORT]: 'Отчёты — скоро будут доступны.',
      [TG_CB_MENU_SUB]: 'Подписка — скоро будет доступна.',
    };
    const stub = stubs[data] ?? 'Неизвестная кнопка.';

    await this.enqueueSendMessage({
      chat_id: chatId,
      text: stub,
      correlationId,
    });
  }

  private async enqueueSendMessage(payload: {
    chat_id: string;
    text: string;
    reply_markup?: Record<string, unknown>;
    correlationId: string;
  }): Promise<void> {
    const { correlationId, ...params } = payload;
    await this.outbound.enqueueApiCall({
      method: 'sendMessage',
      params: params,
      correlationId,
    });
  }

  private async enqueueAnswerCallbackQuery(payload: {
    callback_query_id: string;
    correlationId: string;
  }): Promise<void> {
    const { correlationId, ...params } = payload;
    await this.outbound.enqueueApiCall({
      method: 'answerCallbackQuery',
      params: params,
      correlationId,
    });
  }
}
