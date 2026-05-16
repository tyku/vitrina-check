import { Test, TestingModule } from '@nestjs/testing';
import { ChecklistsService } from '../checklists/checklists.service';
import { TelegramOutboundService } from './telegram-outbound.service';
import { TelegramUserSessionService } from './telegram-user-session.service';
import { TelegramVitrinyUiService } from './telegram-vitriny-ui.service';
import { TG_CB_VITRINY_ADD } from './telegram-vitriny-ui.constants';

describe('TelegramVitrinyUiService', () => {
  let service: TelegramVitrinyUiService;
  let checklists: {
    findByUserId: jest.Mock;
    createForUser: jest.Mock;
  };
  let sessions: {
    setAddVitrina: jest.Mock;
    get: jest.Mock;
    clear: jest.Mock;
  };
  let outbound: { enqueueApiCall: jest.Mock };

  const user = { id: 'mongo-user-1', userId: '42', sourceType: 'tg' as const };

  beforeEach(async () => {
    checklists = {
      findByUserId: jest.fn().mockResolvedValue([]),
      createForUser: jest.fn().mockResolvedValue({
        id: 'c1',
        userId: user.id,
        href: 'https://kredya.ru/',
      }),
    };
    sessions = {
      setAddVitrina: jest.fn().mockResolvedValue(undefined),
      get: jest.fn().mockResolvedValue({ action: 'add_vitrina' }),
      clear: jest.fn().mockResolvedValue(undefined),
    };
    outbound = { enqueueApiCall: jest.fn().mockResolvedValue(undefined) };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        TelegramVitrinyUiService,
        { provide: ChecklistsService, useValue: checklists },
        { provide: TelegramUserSessionService, useValue: sessions },
        { provide: TelegramOutboundService, useValue: outbound },
      ],
    }).compile();

    service = moduleRef.get(TelegramVitrinyUiService);
  });

  it('starts add flow on add callback', async () => {
    const result = await service.handleCallback(
      TG_CB_VITRINY_ADD,
      '100',
      user,
      '42',
      'corr-1',
    );
    expect(result).toBe('handled');
    expect(sessions.setAddVitrina).toHaveBeenCalledWith('42');
  });

  it('creates vitrina from URL text when session active', async () => {
    const handled = await service.handleTextMessage(
      'вот https://kredya.ru/ лендинг',
      '100',
      user,
      '42',
      'corr-2',
    );
    expect(handled).toBe(true);
    expect(checklists.createForUser).toHaveBeenCalledWith(
      user.id,
      'https://kredya.ru/',
    );
    expect(sessions.clear).toHaveBeenCalled();
  });
});
