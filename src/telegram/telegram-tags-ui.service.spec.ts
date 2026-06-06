import { Test, TestingModule } from '@nestjs/testing';
import { ChecklistsService } from '../checklists/checklists.service';
import { TelegramOutboundService } from './telegram-outbound.service';
import { TelegramUserSessionService } from './telegram-user-session.service';
import { TelegramTagsUiService } from './telegram-tags-ui.service';
import { tagsAddCallback } from './telegram-tags-ui.constants';

describe('TelegramTagsUiService', () => {
  let service: TelegramTagsUiService;
  let checklists: {
    findById: jest.Mock;
    findByUserId: jest.Mock;
    setTagsForChecklist: jest.Mock;
  };
  let sessions: {
    setAddOfferTag: jest.Mock;
    get: jest.Mock;
    clear: jest.Mock;
  };

  const user = { id: 'mongo-1', userId: '42', sourceType: 'tg' as const };
  const checklistId = '507f1f77bcf86cd799439011';

  beforeEach(async () => {
    checklists = {
      findByUserId: jest.fn().mockResolvedValue([
        {
          id: checklistId,
          userId: user.id,
          href: 'https://kredya.ru',
          tags: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]),
      findById: jest.fn().mockResolvedValue({
        id: checklistId,
        userId: user.id,
        href: 'https://kredya.ru',
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      setTagsForChecklist: jest.fn().mockResolvedValue({
        id: checklistId,
        userId: user.id,
        href: 'https://kredya.ru',
        tags: ['sravni', 'startracking'],
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    };
    sessions = {
      setAddOfferTag: jest.fn().mockResolvedValue(undefined),
      get: jest.fn().mockResolvedValue({
        action: 'add_offer_tag',
        checklistId,
      }),
      clear: jest.fn().mockResolvedValue(undefined),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        TelegramTagsUiService,
        { provide: ChecklistsService, useValue: checklists },
        { provide: TelegramUserSessionService, useValue: sessions },
        {
          provide: TelegramOutboundService,
          useValue: { enqueueApiCall: jest.fn() },
        },
      ],
    }).compile();

    service = moduleRef.get(TelegramTagsUiService);
  });

  it('adds tags from comma-separated text', async () => {
    checklists.findById.mockResolvedValue({
      id: checklistId,
      userId: user.id,
      href: 'https://kredya.ru',
      tags: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const handled = await service.handleTextMessage(
      'sravni, startracking',
      '100',
      user,
      '42',
      'corr',
    );
    expect(handled).toBe(true);
    expect(checklists.setTagsForChecklist).toHaveBeenCalledWith(
      checklistId,
      user.id,
      ['sravni', 'startracking'],
    );
  });

  it('starts add flow on callback', async () => {
    const result = await service.handleCallback(
      tagsAddCallback(checklistId),
      '100',
      user,
      '42',
      'corr',
    );
    expect(result).toBe('handled');
    expect(sessions.setAddOfferTag).toHaveBeenCalledWith('42', checklistId);
  });
});
