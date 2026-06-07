import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { SchedulesService } from '../schedules/schedules.service';
import type { TResponseScheduleDto } from '../schedules/dto/response-schedule.dto';
import {
  SchedulePeriodicity,
  ScheduleStatus,
} from '../schedules/schemas/schedule.schema';
import type { TResponseUserDto } from '../user/dto/response-user.dto';
import { parsePublishTimeFromText } from './libs/parse-publish-time-from-text';
import { TelegramOutboundService } from './telegram-outbound.service';
import {
  TG_CB_SCHEDULE_BACK_MAIN,
  TG_CB_SCHEDULE_CLEAR,
  TG_CB_SCHEDULE_CLEAR_NO,
  TG_CB_SCHEDULE_CLEAR_YES,
  TG_CB_SCHEDULE_MENU,
  TG_CB_SCHEDULE_PERIODICITY_DAILY,
  TG_CB_SCHEDULE_PERIODICITY_EVERY_OTHER,
  TG_CB_SCHEDULE_PERIODICITY_EVERY_THREE,
  TG_CB_SCHEDULE_PERIODICITY_MENU,
  TG_CB_SCHEDULE_PERIODICITY_WEEKDAYS,
  TG_CB_SCHEDULE_TIME,
  TG_CB_SCHEDULE_TOGGLE,
  parseSchedulePeriodicityCallback,
} from './telegram-schedule-ui.constants';
import { TelegramUserSessionService } from './telegram-user-session.service';

const PERIODICITY_LABELS: Record<SchedulePeriodicity, string> = {
  [SchedulePeriodicity.DAILY]: 'каждый день',
  [SchedulePeriodicity.WEEKDAYS]: 'по будням (пн–пт)',
  [SchedulePeriodicity.EVERY_OTHER_DAY]: 'через день',
  [SchedulePeriodicity.EVERY_THREE_DAYS]: 'раз в 3 дня',
};

@Injectable()
export class TelegramScheduleUiService {
  private readonly logger = new Logger(TelegramScheduleUiService.name);

  constructor(
    private readonly schedules: SchedulesService,
    private readonly sessions: TelegramUserSessionService,
    private readonly outbound: TelegramOutboundService,
  ) {}

  async showMenu(
    chatId: string,
    user: TResponseUserDto,
    correlationId: string,
  ): Promise<void> {
    const items = await this.schedules.findByUserId(user.id);
    const schedule = this.pickUiSchedule(items);
    await this.sendMessage({
      chat_id: chatId,
      text: this.formatMenuMessage(schedule),
      reply_markup: this.buildMenuKeyboard(schedule),
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
    if (data === TG_CB_SCHEDULE_MENU) {
      await this.sessions.clear(telegramUserId);
      await this.showMenu(chatId, user, correlationId);
      return 'handled';
    }

    if (data === TG_CB_SCHEDULE_BACK_MAIN) {
      await this.sessions.clear(telegramUserId);
      return 'back_main';
    }

    if (data === TG_CB_SCHEDULE_PERIODICITY_MENU) {
      await this.showPeriodicityPicker(chatId, user, correlationId);
      return 'handled';
    }

    const periodicity = parseSchedulePeriodicityCallback(data);
    if (periodicity) {
      await this.applyPeriodicity(
        chatId,
        user,
        telegramUserId,
        periodicity,
        correlationId,
      );
      return 'handled';
    }

    if (data === TG_CB_SCHEDULE_TIME) {
      const schedule = await this.getUiScheduleForUser(user.id);
      if (!schedule) {
        await this.sendMessage({
          chat_id: chatId,
          text: 'Сначала выберите периодичность расписания.',
          correlationId,
        });
        await this.showPeriodicityPicker(chatId, user, correlationId);
        return 'handled';
      }
      await this.sessions.setScheduleTime(telegramUserId, {
        scheduleId: schedule.id,
      });
      await this.sendMessage({
        chat_id: chatId,
        text: 'Укажите время в формате ЧЧ:ММ (например 10:00).',
        correlationId,
      });
      return 'handled';
    }

    if (data === TG_CB_SCHEDULE_TOGGLE) {
      await this.toggleSchedule(chatId, user, correlationId);
      return 'handled';
    }

    if (data === TG_CB_SCHEDULE_CLEAR) {
      await this.promptClear(chatId, user, correlationId);
      return 'handled';
    }

    if (data === TG_CB_SCHEDULE_CLEAR_YES) {
      await this.confirmClear(chatId, user, telegramUserId, correlationId);
      return 'handled';
    }

    if (data === TG_CB_SCHEDULE_CLEAR_NO) {
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
    if (session?.action !== 'set_schedule_time') {
      return false;
    }

    const publishTime = parsePublishTimeFromText(text);
    if (!publishTime) {
      await this.sendMessage({
        chat_id: chatId,
        text: 'Неверный формат. Укажите время как ЧЧ:ММ, например 09:30.',
        correlationId,
      });
      return true;
    }

    try {
      if (session.scheduleId) {
        await this.schedules.update(session.scheduleId, { publishTime });
      } else if (session.pendingPeriodicity) {
        await this.schedules.create({
          userId: user.id,
          publishTime,
          periodicity: session.pendingPeriodicity,
          status: ScheduleStatus.ENABLED,
        });
      } else {
        await this.sendMessage({
          chat_id: chatId,
          text: 'Сессия устарела. Откройте «Расписание» заново.',
          correlationId,
        });
        await this.sessions.clear(telegramUserId);
        return true;
      }

      await this.sessions.clear(telegramUserId);
      await this.sendMessage({
        chat_id: chatId,
        text: `Время обновлено: ${publishTime}.`,
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

    return true;
  }

  private async applyPeriodicity(
    chatId: string,
    user: TResponseUserDto,
    telegramUserId: string,
    periodicity: SchedulePeriodicity,
    correlationId: string,
  ): Promise<void> {
    const schedule = await this.getUiScheduleForUser(user.id);
    if (schedule) {
      try {
        await this.schedules.update(schedule.id, { periodicity });
        await this.sendMessage({
          chat_id: chatId,
          text: `Периодичность: ${PERIODICITY_LABELS[periodicity]}.`,
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
      return;
    }

    await this.sessions.setScheduleTime(telegramUserId, { pendingPeriodicity: periodicity });
    await this.sendMessage({
      chat_id: chatId,
      text: `Периодичность: ${PERIODICITY_LABELS[periodicity]}.\nУкажите время в формате ЧЧ:ММ (например 10:00).`,
      correlationId,
    });
  }

  private async toggleSchedule(
    chatId: string,
    user: TResponseUserDto,
    correlationId: string,
  ): Promise<void> {
    const schedule = await this.getUiScheduleForUser(user.id);
    if (!schedule) {
      await this.sendMessage({
        chat_id: chatId,
        text: 'Расписание не задано.',
        correlationId,
      });
      await this.showPeriodicityPicker(chatId, user, correlationId);
      return;
    }

    const nextStatus =
      schedule.status === ScheduleStatus.ENABLED
        ? ScheduleStatus.DISABLED
        : ScheduleStatus.ENABLED;

    try {
      await this.schedules.update(schedule.id, { status: nextStatus });
      const label = nextStatus === ScheduleStatus.ENABLED ? 'включено' : 'выключено';
      await this.sendMessage({
        chat_id: chatId,
        text: `Расписание ${label}.`,
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

  private async promptClear(
    chatId: string,
    user: TResponseUserDto,
    correlationId: string,
  ): Promise<void> {
    const schedule = await this.getUiScheduleForUser(user.id);
    if (!schedule) {
      await this.sendMessage({
        chat_id: chatId,
        text: 'Расписание не задано.',
        correlationId,
      });
      await this.showMenu(chatId, user, correlationId);
      return;
    }

    await this.sendMessage({
      chat_id: chatId,
      text: `Сбросить расписание?\n${this.formatScheduleLine(schedule)}`,
      reply_markup: {
        inline_keyboard: [
          [
            { text: 'Да, сбросить', callback_data: TG_CB_SCHEDULE_CLEAR_YES },
            { text: 'Отмена', callback_data: TG_CB_SCHEDULE_CLEAR_NO },
          ],
        ],
      },
      correlationId,
    });
  }

  private async confirmClear(
    chatId: string,
    user: TResponseUserDto,
    telegramUserId: string,
    correlationId: string,
  ): Promise<void> {
    const schedule = await this.getUiScheduleForUser(user.id);
    if (!schedule) {
      await this.sessions.clear(telegramUserId);
      await this.showMenu(chatId, user, correlationId);
      return;
    }

    try {
      await this.schedules.remove(schedule.id);
      await this.sessions.clear(telegramUserId);
      await this.sendMessage({
        chat_id: chatId,
        text: 'Расписание сброшено.',
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

  private async showPeriodicityPicker(
    chatId: string,
    user: TResponseUserDto,
    correlationId: string,
  ): Promise<void> {
    const schedule = await this.getUiScheduleForUser(user.id);
    const intro = schedule
      ? 'Выберите новую периодичность:'
      : 'Расписание не задано. Выберите периодичность — затем укажите время.\nПри срабатывании проверяются все ваши витрины.';

    await this.sendMessage({
      chat_id: chatId,
      text: intro,
      reply_markup: this.buildPeriodicityKeyboard(),
      correlationId,
    });
  }

  private async getUiScheduleForUser(
    userId: string,
  ): Promise<TResponseScheduleDto | null> {
    const items = await this.schedules.findByUserId(userId);
    return this.pickUiSchedule(items);
  }

  private pickUiSchedule(
    schedules: TResponseScheduleDto[],
  ): TResponseScheduleDto | null {
    if (!schedules.length) {
      return null;
    }

    if (schedules.length > 1) {
      this.logger.warn(
        `User has ${schedules.length} schedules; TG UI edits the latest by updatedAt`,
      );
    }

    return schedules.reduce((latest, current) => {
      const latestTs = this.scheduleTimestamp(latest);
      const currentTs = this.scheduleTimestamp(current);
      return currentTs >= latestTs ? current : latest;
    });
  }

  private scheduleTimestamp(schedule: TResponseScheduleDto): number {
    const value = schedule.updatedAt ?? schedule.createdAt;
    return value ? new Date(value).getTime() : 0;
  }

  private formatMenuMessage(schedule: TResponseScheduleDto | null): string {
    if (!schedule) {
      return (
        'Расписание не задано.\n' +
        'При срабатывании проверяются все ваши витрины.\n' +
        'Нажмите «Настроить», чтобы задать периодичность и время.'
      );
    }

    const status =
      schedule.status === ScheduleStatus.ENABLED ? 'включено' : 'выключено';
    return `Текущее расписание (${status}):\n${this.formatScheduleLine(schedule)}\n\nПроверяются все ваши витрины.`;
  }

  private formatScheduleLine(schedule: TResponseScheduleDto): string {
    return `${PERIODICITY_LABELS[schedule.periodicity]} в ${schedule.publishTime}`;
  }

  private buildMenuKeyboard(
    schedule: TResponseScheduleDto | null,
  ): Record<string, unknown> {
    if (!schedule) {
      return {
        inline_keyboard: [
          [
            {
              text: '⚙️ Настроить',
              callback_data: TG_CB_SCHEDULE_PERIODICITY_MENU,
            },
          ],
          [{ text: '◀️ В главное меню', callback_data: TG_CB_SCHEDULE_BACK_MAIN }],
        ],
      };
    }

    const toggleLabel =
      schedule.status === ScheduleStatus.ENABLED ? '⏸ Выключить' : '▶️ Включить';

    return {
      inline_keyboard: [
        [
          {
            text: '📅 Периодичность',
            callback_data: TG_CB_SCHEDULE_PERIODICITY_MENU,
          },
          { text: '🕐 Время', callback_data: TG_CB_SCHEDULE_TIME },
        ],
        [
          { text: toggleLabel, callback_data: TG_CB_SCHEDULE_TOGGLE },
          { text: '🗑 Сбросить', callback_data: TG_CB_SCHEDULE_CLEAR },
        ],
        [
          { text: '🔄 Обновить', callback_data: TG_CB_SCHEDULE_MENU },
          { text: '◀️ Меню', callback_data: TG_CB_SCHEDULE_BACK_MAIN },
        ],
      ],
    };
  }

  private buildPeriodicityKeyboard(): Record<string, unknown> {
    return {
      inline_keyboard: [
        [
          { text: 'Каждый день', callback_data: TG_CB_SCHEDULE_PERIODICITY_DAILY },
          { text: 'По будням', callback_data: TG_CB_SCHEDULE_PERIODICITY_WEEKDAYS },
        ],
        [
          {
            text: 'Через день',
            callback_data: TG_CB_SCHEDULE_PERIODICITY_EVERY_OTHER,
          },
          {
            text: 'Раз в 3 дня',
            callback_data: TG_CB_SCHEDULE_PERIODICITY_EVERY_THREE,
          },
        ],
        [{ text: '◀️ Назад', callback_data: TG_CB_SCHEDULE_MENU }],
      ],
    };
  }

  private errorMessage(error: unknown): string {
    if (error instanceof BadRequestException) {
      return error.message;
    }
    if (error instanceof NotFoundException) {
      return 'Расписание не найдено.';
    }
    this.logger.warn(`Schedule UI error: ${(error as Error).message}`);
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
