import {
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DispatchParseResultMatchType } from './schemas/dispatch-parse-result.schema';
import { DispatchParseResultsRepository } from './dispatch-parse-results.repository';
import { DispatchParseResultsService } from './dispatch-parse-results.service';

describe('DispatchParseResultsService', () => {
  let service: DispatchParseResultsService;
  let repository: {
    findRecentByUserId: jest.Mock;
    findByQueueItemId: jest.Mock;
  };

  const ownerUserId = 'mongo-user-1';
  const otherUserId = 'mongo-user-2';
  const queueItemId = '507f1f77bcf86cd799439011';
  const analyzedAt = new Date('2026-06-01T12:00:00.000Z');

  const storedResult = {
    queueItemId,
    userId: ownerUserId,
    checklistId: 'checklist-1',
    scheduleId: 'schedule-1',
    url: 'https://kredya.ru',
    analyzedAt,
    patterns: ['sravni'],
    matches: [
      {
        matchType: DispatchParseResultMatchType.DIRECT,
        pattern: 'sravni',
        href: 'https://example.com/sravni',
        anchorText: 'Offer',
        blockName: 'main',
        blockSelector: '.main',
        positionOnPage: 1,
        positionInBlock: 1,
      },
    ],
  };

  beforeEach(async () => {
    repository = {
      findRecentByUserId: jest.fn().mockResolvedValue([storedResult]),
      findByQueueItemId: jest.fn().mockResolvedValue(storedResult),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        DispatchParseResultsService,
        {
          provide: DispatchParseResultsRepository,
          useValue: repository,
        },
      ],
    }).compile();

    service = moduleRef.get(DispatchParseResultsService);
  });

  describe('findRecentForUser', () => {
    it('returns slim results for the requested user', async () => {
      const results = await service.findRecentForUser(ownerUserId, 5);

      expect(repository.findRecentByUserId).toHaveBeenCalledWith(
        ownerUserId,
        5,
      );
      expect(results).toEqual([
        {
          queueItemId,
          checklistId: 'checklist-1',
          scheduleId: 'schedule-1',
          url: 'https://kredya.ru',
          analyzedAt,
          patterns: ['sravni'],
          matches: storedResult.matches,
        },
      ]);
    });
  });

  describe('findByQueueItemIdForUser', () => {
    it('returns the result when the user owns it', async () => {
      const result = await service.findByQueueItemIdForUser(
        queueItemId,
        ownerUserId,
      );

      expect(result.queueItemId).toBe(queueItemId);
      expect(result).not.toHaveProperty('userId');
    });

    it('throws NotFoundException when the result is missing', async () => {
      repository.findByQueueItemId.mockResolvedValue(null);

      await expect(
        service.findByQueueItemIdForUser(queueItemId, ownerUserId),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws ForbiddenException when the user does not own the result', async () => {
      await expect(
        service.findByQueueItemIdForUser(queueItemId, otherUserId),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});
