import { Test, TestingModule } from '@nestjs/testing';
import { SchedulesService } from '../schedules/schedules.service';
import {
  SchedulePeriodicity,
  ScheduleStatus,
} from '../schedules/schemas/schedule.schema';
import { TelegramOutboundService } from './telegram-outbound.service';
import { TelegramScheduleUiService } from './telegram-schedule-ui.service';
import {
  TG_CB_SCHEDULE_PERIODICITY_DAILY,
  TG_CB_SCHEDULE_TIME,
} from './telegram-schedule-ui.constants';
import { TelegramUserSessionService } from './telegram-user-session.service';

describe('TelegramScheduleUiService', () => {
  let service: TelegramScheduleUiService;
  let schedules: {
    findByUserId: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
  };
  let sessions: {
    setScheduleTime: jest.Mock;
    get: jest.Mock;
    clear: jest.Mock;
  };
  let outbound: { enqueueApiCall: jest.Mock };

  const user = { id: 'mongo-user-1', userId: '42', sourceType: 'tg' as const };

  beforeEach(async () => {
    schedules = {
      findByUserId: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({
        id: 'sch-1',
        userId: user.id,
        publishTime: '10:00',
        periodicity: SchedulePeriodicity.DAILY,
        status: ScheduleStatus.ENABLED,
      }),
      update: jest.fn().mockResolvedValue({
        id: 'sch-1',
        userId: user.id,
        publishTime: '09:30',
        periodicity: SchedulePeriodicity.DAILY,
        status: ScheduleStatus.ENABLED,
      }),
      remove: jest.fn().mockResolvedValue(undefined),
    };
    sessions = {
      setScheduleTime: jest.fn().mockResolvedValue(undefined),
      get: jest.fn().mockResolvedValue({
        action: 'set_schedule_time',
        pendingPeriodicity: SchedulePeriodicity.DAILY,
      }),
      clear: jest.fn().mockResolvedValue(undefined),
    };
    outbound = { enqueueApiCall: jest.fn().mockResolvedValue(undefined) };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        TelegramScheduleUiService,
        { provide: SchedulesService, useValue: schedules },
        { provide: TelegramUserSessionService, useValue: sessions },
        { provide: TelegramOutboundService, useValue: outbound },
      ],
    }).compile();

    service = moduleRef.get(TelegramScheduleUiService);
  });

  it('starts create flow on periodicity pick when no schedule', async () => {
    const result = await service.handleCallback(
      TG_CB_SCHEDULE_PERIODICITY_DAILY,
      '100',
      user,
      '42',
      'corr-1',
    );
    expect(result).toBe('handled');
    expect(sessions.setScheduleTime).toHaveBeenCalledWith('42', {
      pendingPeriodicity: SchedulePeriodicity.DAILY,
    });
    expect(schedules.create).not.toHaveBeenCalled();
  });

  it('creates schedule from time text when pending periodicity session active', async () => {
    const handled = await service.handleTextMessage(
      '10:15',
      '100',
      user,
      '42',
      'corr-2',
    );
    expect(handled).toBe(true);
    expect(schedules.create).toHaveBeenCalledWith({
      userId: user.id,
      publishTime: '10:15',
      periodicity: SchedulePeriodicity.DAILY,
      status: ScheduleStatus.ENABLED,
    });
    expect(sessions.clear).toHaveBeenCalled();
  });

  it('opens time edit session when schedule exists', async () => {
    schedules.findByUserId.mockResolvedValue([
      {
        id: 'sch-1',
        userId: user.id,
        publishTime: '10:00',
        periodicity: SchedulePeriodicity.DAILY,
        status: ScheduleStatus.ENABLED,
        updatedAt: new Date('2026-06-01'),
      },
    ]);

    const result = await service.handleCallback(
      TG_CB_SCHEDULE_TIME,
      '100',
      user,
      '42',
      'corr-3',
    );
    expect(result).toBe('handled');
    expect(sessions.setScheduleTime).toHaveBeenCalledWith('42', {
      scheduleId: 'sch-1',
    });
  });
});
