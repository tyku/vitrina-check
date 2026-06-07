import { DispatchParseResultMatchType } from '../schemas/dispatch-parse-result.schema';
import {
  buildSlimParseResult,
  findFirstDirectPattern,
  findFirstUrlPattern,
} from './slim-parse-result';

describe('slim-parse-result', () => {
  const patterns = ['sravni', 'startracking'];

  describe('findFirstDirectPattern', () => {
    it('returns the first matching tag pattern for href', () => {
      expect(
        findFirstDirectPattern('https://example.com/sravni/offer', patterns),
      ).toBe('sravni');
    });
  });

  describe('findFirstUrlPattern', () => {
    it('matches pattern in redirect URL host', () => {
      expect(
        findFirstUrlPattern(
          'https://goto.startracking.ru/api/v1/redirect?offer_id=1',
          patterns,
        ),
      ).toBe('startracking');
    });
  });

  describe('buildSlimParseResult', () => {
    it('keeps tag-relevant offer fields and drops chain/resolution noise', () => {
      const result = buildSlimParseResult({
        queueItemId: 'queue-1',
        userId: 'user-1',
        checklistId: 'checklist-1',
        scheduleId: 'schedule-1',
        url: 'https://kredya.ru',
        analyzedAt: new Date('2026-06-06T23:05:40.541Z'),
        patterns,
        analysis: {
          artifactHtmlPath: '/tmp/page.html',
          patterns,
          shortLinkResolveMode: 'chain',
          totalOffers: 19,
          directMatches: [
            {
              href: 'https://example.com/sravni/direct',
              anchorText: 'Direct offer',
              blockName: 'top',
              blockSelector: 'div.top',
              positionOnPage: 1,
              positionInBlock: 1,
            },
          ],
          resolvedMatches: [
            {
              href: 'https://sovtrk.ru/c/g5jo9',
              anchorText: 'Resolved offer',
              blockName: 'last_list',
              blockSelector: 'div.last_list',
              positionOnPage: 2,
              positionInBlock: 2,
              finalUrl:
                'https://goto.startracking.ru/api/v1/redirect?offer_id=100628',
              statusCode: 200,
              matchedUrl:
                'https://goto.startracking.ru/api/v1/redirect?offer_id=100628',
              matchedHopIndex: 1,
              chain: [
                { url: 'https://sovtrk.ru/c/g5jo9?nc=1', statusCode: 303 },
                {
                  url: 'https://goto.startracking.ru/api/v1/redirect?offer_id=100628',
                  statusCode: 200,
                },
              ],
            },
          ],
          shortLinkResolutions: [
            {
              sourceUrl: 'https://sovtrk.ru/c/g5jo9',
              finalUrl:
                'https://goto.startracking.ru/api/v1/redirect?offer_id=100628',
              statusCode: 200,
              error: '',
            },
          ],
        },
      });

      expect(result).toEqual({
        queueItemId: 'queue-1',
        userId: 'user-1',
        checklistId: 'checklist-1',
        scheduleId: 'schedule-1',
        url: 'https://kredya.ru',
        analyzedAt: new Date('2026-06-06T23:05:40.541Z'),
        patterns,
        matches: [
          {
            matchType: DispatchParseResultMatchType.DIRECT,
            pattern: 'sravni',
            href: 'https://example.com/sravni/direct',
            anchorText: 'Direct offer',
            blockName: 'top',
            blockSelector: 'div.top',
            positionOnPage: 1,
            positionInBlock: 1,
          },
          {
            matchType: DispatchParseResultMatchType.RESOLVED,
            pattern: 'startracking',
            href: 'https://sovtrk.ru/c/g5jo9',
            anchorText: 'Resolved offer',
            blockName: 'last_list',
            blockSelector: 'div.last_list',
            positionOnPage: 2,
            positionInBlock: 2,
            finalUrl:
              'https://goto.startracking.ru/api/v1/redirect?offer_id=100628',
          },
        ],
      });
    });
  });
});
