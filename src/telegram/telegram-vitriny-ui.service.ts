import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ChecklistsService } from '../checklists/checklists.service';
import { extractUrlFromText } from '../checklists/libs/extract-url-from-text';
import type { TResponseChecklistDto } from '../checklists/dto/response-checklist.dto';
import type { TResponseUserDto } from '../user/dto/response-user.dto';
import { TelegramOutboundService } from './telegram-outbound.service';
import {
  TG_CB_VITRINY_ADD,
  TG_CB_VITRINY_BACK_MAIN,
  TG_CB_VITRINY_DELETE_NO_PREFIX,
  TG_CB_VITRINY_DELETE_PREFIX,
  TG_CB_VITRINY_DELETE_YES_PREFIX,
  TG_CB_VITRINY_LIST,
  TG_CB_VITRINY_MENU,
  vitrinyDeleteCallback,
  vitrinyDeleteNoCallback,
  vitrinyDeleteYesCallback,
} from './telegram-vitriny-ui.constants';
import { TelegramUserSessionService } from './telegram-user-session.service';

function truncateLabel(href: string, max = 36): string {
  if (href.length <= max) {
    return href;
  }
  return `${href.slice(0, max - 1)}…`;
}

@Injectable()
export class TelegramVitrinyUiService {
  private readonly logger = new Logger(TelegramVitrinyUiService.name);

  constructor(
    private readonly checklists: ChecklistsService,
    private readonly sessions: TelegramUserSessionService,
    private readonly outbound: TelegramOutboundService,
  ) {}

  async showMenu(
    chatId: string,
    user: TResponseUserDto,
    correlationId: string,
  ): Promise<void> {
    const items = await this.checklists.findByUserId(user.id);
    const text = this.formatListMessage(items);
    await this.sendMessage({
      chat_id: chatId,
      text,
      reply_markup: this.buildListKeyboard(items),
      correlationId,
    });
  }

  async handleCallback(
    data: string,
    chatId: string,
    user: TResponseUserDto,
    telegramUserId: string,
    correlationId: string,
  ): Promise<'handled' | 'back_main' | 'unknown'> {
    if (data === TG_CB_VITRINY_MENU || data === TG_CB_VITRINY_LIST) {
      await this.sessions.clear(telegramUserId);
      await this.showMenu(chatId, user, correlationId);
      return 'handled';
    }

    if (data === TG_CB_VITRINY_ADD) {
      await this.sessions.setAddVitrina(telegramUserId);
      await this.sendMessage({
        chat_id: chatId,
        text: 'Отправьте ссылку на витрину (https://…).',
        correlationId,
      });
      return 'handled';
    }

    if (data === TG_CB_VITRINY_BACK_MAIN) {
      await this.sessions.clear(telegramUserId);
      return 'back_main';
    }

    if (data.startsWith(TG_CB_VITRINY_DELETE_PREFIX)) {
      const id = data.slice(TG_CB_VITRINY_DELETE_PREFIX.length);
      await this.promptDelete(chatId, user, id, correlationId);
      return 'handled';
    }

    if (data.startsWith(TG_CB_VITRINY_DELETE_YES_PREFIX)) {
      const id = data.slice(TG_CB_VITRINY_DELETE_YES_PREFIX.length);
      await this.confirmDelete(chatId, user, id, telegramUserId, correlationId);
      return 'handled';
    }

    if (data.startsWith(TG_CB_VITRINY_DELETE_NO_PREFIX)) {
      await this.sessions.clear(telegramUserId);
      await this.showMenu(chatId, user, correlationId);
      return 'handled';
    }

    return 'unknown';
  }

  async handleTextMessage(
    text: string,
    chatId: string,
    user: TResponseUserDto,
    telegramUserId: string,
    correlationId: string,
  ): Promise<boolean> {
    const session = await this.sessions.get(telegramUserId);
    if (session?.action !== 'add_vitrina') {
      return false;
    }

    const extracted = extractUrlFromText(text);
    if (!extracted) {
      await this.sendMessage({
        chat_id: chatId,
        text: 'Не вижу ссылку. Пришлите URL, например https://example.com/',
        correlationId,
      });
      return true;
    }

    try {
      await this.checklists.createForUser(user.id, extracted);
      await this.sessions.clear(telegramUserId);
      await this.sendMessage({
        chat_id: chatId,
        text: `Витрина добавлена:\n${extracted}`,
        correlationId,
      });
      await this.showMenu(chatId, user, correlationId);
    } catch (error) {
      const message = this.errorMessage(error);
      await this.sendMessage({
        chat_id: chatId,
        text: message,
        correlationId,
      });
    }

    return true;
  }

  private async promptDelete(
    chatId: string,
    user: TResponseUserDto,
    checklistId: string,
    correlationId: string,
  ): Promise<void> {
    let item: TResponseChecklistDto;
    try {
      item = await this.checklists.findById(checklistId);
    } catch (error) {
      if (error instanceof NotFoundException) {
        await this.sendMessage({
          chat_id: chatId,
          text: 'Витрина не найдена.',
          correlationId,
        });
        return;
      }
      throw error;
    }

    if (item.userId !== user.id) {
      await this.sendMessage({
        chat_id: chatId,
        text: 'Нельзя удалить чужую витрину.',
        correlationId,
      });
      return;
    }

    await this.sendMessage({
      chat_id: chatId,
      text: `Удалить витрину?\n${item.href}`,
      reply_markup: {
        inline_keyboard: [
          [
            { text: 'Да, удалить', callback_data: vitrinyDeleteYesCallback(item.id) },
            { text: 'Отмена', callback_data: vitrinyDeleteNoCallback(item.id) },
          ],
        ],
      },
      correlationId,
    });
  }

  private async confirmDelete(
    chatId: string,
    user: TResponseUserDto,
    checklistId: string,
    telegramUserId: string,
    correlationId: string,
  ): Promise<void> {
    try {
      await this.checklists.removeForUser(checklistId, user.id);
      await this.sessions.clear(telegramUserId);
      await this.sendMessage({
        chat_id: chatId,
        text: 'Витрина удалена.',
        correlationId,
      });
      await this.showMenu(chatId, user, correlationId);
    } catch (error) {
      await this.sendMessage({
        chat_id: chatId,
        text: this.errorMessage(error),
        correlationId,
      });
    }
  }

  private formatListMessage(items: TResponseChecklistDto[]): string {
    if (!items.length) {
      return 'Витрины пока не добавлены. Нажмите «Добавить» или пришлите ссылку после нажатия.';
    }

    const lines = items.map(
      (item, index) => `${index + 1}. ${item.name ? `${item.name} — ` : ''}${item.href}`,
    );
    return `Ваши витрины (${items.length}):\n\n${lines.join('\n')}`;
  }

  private buildListKeyboard(
    items: TResponseChecklistDto[],
  ): Record<string, unknown> {
    const rows: Array<Array<{ text: string; callback_data: string }>> = [
      [
        { text: '➕ Добавить', callback_data: TG_CB_VITRINY_ADD },
        { text: '🔄 Обновить', callback_data: TG_CB_VITRINY_LIST },
      ],
    ];

    for (const [index, item] of items.entries()) {
      rows.push([
        {
          text: `🗑 ${index + 1}. ${truncateLabel(item.href)}`,
          callback_data: vitrinyDeleteCallback(item.id),
        },
      ]);
    }

    rows.push([{ text: '◀️ В главное меню', callback_data: TG_CB_VITRINY_BACK_MAIN }]);

    return { inline_keyboard: rows };
  }

  private errorMessage(error: unknown): string {
    if (
      error instanceof BadRequestException ||
      error instanceof ConflictException
    ) {
      return error.message;
    }
    if (error instanceof NotFoundException) {
      return 'Витрина не найдена.';
    }
    this.logger.warn(`Vitriny UI error: ${(error as Error).message}`);
    return 'Не удалось выполнить действие. Попробуйте позже.';
  }

  private async sendMessage(payload: {
    chat_id: string;
    text: string;
    reply_markup?: Record<string, unknown>;
    correlationId: string;
  }): Promise<void> {
    const { correlationId, ...params } = payload;
    await this.outbound.enqueueApiCall({
      method: 'sendMessage',
      params,
      correlationId,
    });
  }
}
