import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ChecklistsService } from '../checklists/checklists.service';
import {
  normalizeOfferTags,
  parseOfferTagsFromText,
} from '../checklists/libs/normalize-offer-tags';
import type { TResponseChecklistDto } from '../checklists/dto/response-checklist.dto';
import type { TResponseUserDto } from '../user/dto/response-user.dto';
import { TelegramOutboundService } from './telegram-outbound.service';
import {
  TG_CB_TAGS_BACK_MAIN,
  TG_CB_TAGS_BACK_VITRINAS,
  TG_CB_TAGS_DELETE_PREFIX,
  TG_CB_TAGS_DELETE_NO_PREFIX,
  TG_CB_TAGS_DELETE_YES_PREFIX,
  TG_CB_TAGS_LIST_PREFIX,
  TG_CB_TAGS_MENU,
  TG_CB_TAGS_PICK_PREFIX,
  TG_CB_TAGS_ADD_PREFIX,
  parseTagsChecklistId,
  parseTagsDeleteTarget,
  tagsAddCallback,
  tagsDeleteIndexCallback,
  tagsDeleteNoCallback,
  tagsDeleteYesCallback,
  tagsListCallback,
  tagsPickChecklistCallback,
} from './telegram-tags-ui.constants';
import { TelegramUserSessionService } from './telegram-user-session.service';

function truncateLabel(href: string, max = 32): string {
  if (href.length <= max) {
    return href;
  }
  return `${href.slice(0, max - 1)}…`;
}

@Injectable()
export class TelegramTagsUiService {
  private readonly logger = new Logger(TelegramTagsUiService.name);

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
    await this.sendMessage({
      chat_id: chatId,
      text: this.formatVitrinaPickerMessage(items),
      reply_markup: this.buildVitrinaPickerKeyboard(items),
      correlationId,
    });
  }

  async showChecklistTags(
    chatId: string,
    user: TResponseUserDto,
    checklistId: string,
    correlationId: string,
  ): Promise<void> {
    let checklist: TResponseChecklistDto;
    try {
      checklist = await this.checklists.findById(checklistId);
    } catch (error) {
      if (error instanceof NotFoundException) {
        await this.sendMessage({
          chat_id: chatId,
          text: 'Витрина не найдена.',
          correlationId,
        });
        await this.showMenu(chatId, user, correlationId);
        return;
      }
      throw error;
    }

    if (checklist.userId !== user.id) {
      await this.sendMessage({
        chat_id: chatId,
        text: 'Нет доступа к этой витрине.',
        correlationId,
      });
      await this.showMenu(chatId, user, correlationId);
      return;
    }

    await this.sendMessage({
      chat_id: chatId,
      text: this.formatTagsMessage(checklist),
      reply_markup: this.buildTagsKeyboard(checklist),
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
    if (data === TG_CB_TAGS_MENU) {
      await this.sessions.clear(telegramUserId);
      await this.showMenu(chatId, user, correlationId);
      return 'handled';
    }

    if (data === TG_CB_TAGS_BACK_MAIN) {
      await this.sessions.clear(telegramUserId);
      return 'back_main';
    }

    if (data === TG_CB_TAGS_BACK_VITRINAS) {
      await this.sessions.clear(telegramUserId);
      await this.showMenu(chatId, user, correlationId);
      return 'handled';
    }

    const pickId = parseTagsChecklistId(data, TG_CB_TAGS_PICK_PREFIX);
    if (pickId) {
      await this.sessions.clear(telegramUserId);
      await this.showChecklistTags(chatId, user, pickId, correlationId);
      return 'handled';
    }

    const addId = parseTagsChecklistId(data, TG_CB_TAGS_ADD_PREFIX);
    if (addId) {
      await this.sessions.setAddOfferTag(telegramUserId, addId);
      const checklist = await this.checklists.findById(addId);
      await this.sendMessage({
        chat_id: chatId,
        text: `Метки для ${truncateLabel(checklist.href)}.\n\nОтправьте метку (например sravni). Несколько — через запятую.`,
        correlationId,
      });
      return 'handled';
    }

    const listId = parseTagsChecklistId(data, TG_CB_TAGS_LIST_PREFIX);
    if (listId) {
      await this.showChecklistTags(chatId, user, listId, correlationId);
      return 'handled';
    }

    const deleteTarget = parseTagsDeleteTarget(
      data,
      TG_CB_TAGS_DELETE_PREFIX,
    );
    if (deleteTarget) {
      await this.promptDelete(
        chatId,
        user,
        deleteTarget.checklistId,
        deleteTarget.index,
        correlationId,
      );
      return 'handled';
    }

    const confirmTarget = parseTagsDeleteTarget(
      data,
      TG_CB_TAGS_DELETE_YES_PREFIX,
    );
    if (confirmTarget) {
      await this.confirmDelete(
        chatId,
        user,
        confirmTarget.checklistId,
        confirmTarget.index,
        telegramUserId,
        correlationId,
      );
      return 'handled';
    }

    const cancelTarget = parseTagsDeleteTarget(
      data,
      TG_CB_TAGS_DELETE_NO_PREFIX,
    );
    if (cancelTarget) {
      await this.sessions.clear(telegramUserId);
      await this.showChecklistTags(
        chatId,
        user,
        cancelTarget.checklistId,
        correlationId,
      );
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
    if (session?.action !== 'add_offer_tag') {
      return false;
    }

    const parts = parseOfferTagsFromText(text);
    if (!parts.length) {
      await this.sendMessage({
        chat_id: chatId,
        text: 'Пришлите метку, например: sravni',
        correlationId,
      });
      return true;
    }

    const { checklistId } = session;

    try {
      const current = await this.checklists.findById(checklistId);
      if (current.userId !== user.id) {
        throw new BadRequestException('Нет доступа к этой витрине.');
      }

      const merged = normalizeOfferTags([...current.tags, ...parts]);
      if (!merged.ok) {
        throw new BadRequestException(merged.error);
      }
      await this.checklists.setTagsForChecklist(
        checklistId,
        user.id,
        merged.tags,
      );
      await this.sessions.clear(telegramUserId);
      await this.sendMessage({
        chat_id: chatId,
        text: `Метки сохранены (${merged.tags.length}): ${merged.tags.join(', ')}`,
        correlationId,
      });
      await this.showChecklistTags(chatId, user, checklistId, correlationId);
    } catch (error) {
      await this.sendMessage({
        chat_id: chatId,
        text: this.errorMessage(error),
        correlationId,
      });
    }

    return true;
  }

  private async promptDelete(
    chatId: string,
    user: TResponseUserDto,
    checklistId: string,
    index: number,
    correlationId: string,
  ): Promise<void> {
    const checklist = await this.loadOwnedChecklist(
      chatId,
      user,
      checklistId,
      correlationId,
    );
    if (!checklist) {
      return;
    }

    const tag = checklist.tags[index];
    if (!tag) {
      await this.sendMessage({
        chat_id: chatId,
        text: 'Метка не найдена.',
        correlationId,
      });
      return;
    }

    await this.sendMessage({
      chat_id: chatId,
      text: `Удалить метку «${tag}»?`,
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: 'Да, удалить',
              callback_data: tagsDeleteYesCallback(checklistId, index),
            },
            {
              text: 'Отмена',
              callback_data: tagsDeleteNoCallback(checklistId, index),
            },
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
    index: number,
    telegramUserId: string,
    correlationId: string,
  ): Promise<void> {
    try {
      await this.checklists.removeTagByIndexForChecklist(
        checklistId,
        user.id,
        index,
      );
      await this.sessions.clear(telegramUserId);
      await this.sendMessage({
        chat_id: chatId,
        text: 'Метка удалена.',
        correlationId,
      });
      await this.showChecklistTags(chatId, user, checklistId, correlationId);
    } catch (error) {
      await this.sendMessage({
        chat_id: chatId,
        text: this.errorMessage(error),
        correlationId,
      });
    }
  }

  private async loadOwnedChecklist(
    chatId: string,
    user: TResponseUserDto,
    checklistId: string,
    correlationId: string,
  ): Promise<TResponseChecklistDto | null> {
    try {
      const checklist = await this.checklists.findById(checklistId);
      if (checklist.userId !== user.id) {
        await this.sendMessage({
          chat_id: chatId,
          text: 'Нет доступа к этой витрине.',
          correlationId,
        });
        return null;
      }
      return checklist;
    } catch (error) {
      if (error instanceof NotFoundException) {
        await this.sendMessage({
          chat_id: chatId,
          text: 'Витрина не найдена.',
          correlationId,
        });
        return null;
      }
      throw error;
    }
  }

  private formatVitrinaPickerMessage(items: TResponseChecklistDto[]): string {
    if (!items.length) {
      return 'Сначала добавьте витрину в разделе «Витрины», затем задайте для неё метки.';
    }
    return 'Выберите витрину, для которой настроить метки:';
  }

  private buildVitrinaPickerKeyboard(
    items: TResponseChecklistDto[],
  ): Record<string, unknown> {
    const rows: Array<Array<{ text: string; callback_data: string }>> = [];

    for (const item of items) {
      const tagCount = item.tags.length;
      const suffix = tagCount ? ` · ${tagCount} мет.` : '';
      rows.push([
        {
          text: `${truncateLabel(item.href)}${suffix}`,
          callback_data: tagsPickChecklistCallback(item.id),
        },
      ]);
    }

    rows.push([
      { text: '◀️ В главное меню', callback_data: TG_CB_TAGS_BACK_MAIN },
    ]);

    return { inline_keyboard: rows };
  }

  private formatTagsMessage(checklist: TResponseChecklistDto): string {
    const header = `Метки: ${truncateLabel(checklist.href, 40)}`;
    if (!checklist.tags.length) {
      return `${header}\n\nМеток пока нет. Нажмите «Добавить» — например: sravni, startracking`;
    }
    const lines = checklist.tags.map((tag, index) => `${index + 1}. ${tag}`);
    return `${header}\n\n${lines.join('\n')}\n\nИщем их в URL редиректов.`;
  }

  private buildTagsKeyboard(
    checklist: TResponseChecklistDto,
  ): Record<string, unknown> {
    const id = checklist.id;
    const rows: Array<Array<{ text: string; callback_data: string }>> = [
      [
        { text: '➕ Добавить', callback_data: tagsAddCallback(id) },
        { text: '🔄 Обновить', callback_data: tagsListCallback(id) },
      ],
    ];

    for (const [index, tag] of checklist.tags.entries()) {
      const label =
        tag.length > 28
          ? `${index + 1}. ${tag.slice(0, 27)}…`
          : `${index + 1}. ${tag}`;
      rows.push([
        {
          text: `🗑 ${label}`,
          callback_data: tagsDeleteIndexCallback(id, index),
        },
      ]);
    }

    rows.push([
      { text: '◀️ К списку витрин', callback_data: TG_CB_TAGS_BACK_VITRINAS },
    ]);
    rows.push([
      { text: '◀️ В главное меню', callback_data: TG_CB_TAGS_BACK_MAIN },
    ]);

    return { inline_keyboard: rows };
  }

  private errorMessage(error: unknown): string {
    if (
      error instanceof BadRequestException ||
      error instanceof ConflictException
    ) {
      return error.message;
    }
    this.logger.warn(`Tags UI error: ${(error as Error).message}`);
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
