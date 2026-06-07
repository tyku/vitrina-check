import { DispatchParseResultMatchType } from '../schemas/dispatch-parse-result.schema';
import {
  enrichParseMatches,
  maybeEnrichParseMatches,
} from './enrich-parse-matches';
import type { TSlimParseResultPayload } from './slim-parse-result';

jest.mock('../../offers/libs/continue-resolve-past-tracker', () => ({
  continueResolvePastTracker: jest.fn(),
}));

jest.mock('../../offers/libs/resolve-short-link-chain', () => ({
  resolveShortLinkChain: jest.fn(),
}));

import { continueResolvePastTracker } from '../../offers/libs/continue-resolve-past-tracker';

const mockedContinue = continueResolvePastTracker as jest.MockedFunction<
  typeof continueResolvePastTracker
>;

describe('enrich-parse-matches', () => {
  const patterns = ['startracking'];
  const basePayload: TSlimParseResultPayload = {
    queueItemId: 'queue-1',
    userId: 'user-1',
    checklistId: 'checklist-1',
    url: 'https://kredya.ru',
    analyzedAt: new Date('2026-06-07T21:40:40.380Z'),
    patterns,
    matches: [
      {
        matchType: DispatchParseResultMatchType.RESOLVED,
        pattern: 'startracking',
        href: 'https://sovtrk.ru/c/g5jo9',
        anchorText: 'Offer',
        blockName: 'last_list',
        blockSelector: 'div.last_list',
        positionOnPage: 1,
        positionInBlock: 1,
        finalUrl:
          'https://goto.startracking.ru/api/v1/redirect?offer_id=100628',
      },
    ],
  };

  const analysis = {
    artifactHtmlPath: '/tmp/page.html',
    patterns,
    totalOffers: 1,
    directMatches: [],
    resolvedMatches: [
      {
        href: 'https://sovtrk.ru/c/g5jo9',
        anchorText: 'Offer',
        blockName: 'last_list',
        blockSelector: 'div.last_list',
        positionOnPage: 1,
        positionInBlock: 1,
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
  };

  beforeEach(() => {
    mockedContinue.mockReset();
  });

  it('maybeEnrichParseMatches returns payload unchanged when disabled', async () => {
    const result = await maybeEnrichParseMatches(basePayload, {
      enabled: false,
      patterns,
      analysis,
    });

    expect(result).toBe(basePayload);
    expect(mockedContinue).not.toHaveBeenCalled();
  });

  it('adds tagMatchedInChain and destination fields when chain extends past tracker', async () => {
    mockedContinue.mockResolvedValue([
      { url: 'https://zaymer.ru/landing', statusCode: 200 },
    ]);

    const result = await enrichParseMatches(basePayload, {
      patterns,
      analysis,
    });

    expect(result.matches[0]).toMatchObject({
      tagMatchedInChain: true,
      destinationHost: 'zaymer.ru',
      destinationUrl: 'zaymer.ru',
    });
  });
});
