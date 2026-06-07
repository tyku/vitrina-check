import { pickDestinationFromChain } from './pick-destination-from-chain';

describe('pickDestinationFromChain', () => {
  const patterns = ['startracking', 'sravni'];

  it('returns the last non-tracker hostname in the chain', () => {
    const result = pickDestinationFromChain(
      [
        { url: 'https://sovtrk.ru/c/g5jo9?nc=1', statusCode: 303 },
        {
          url: 'https://goto.startracking.ru/api/v1/redirect?offer_id=1',
          statusCode: 200,
        },
        { url: 'https://zaymer.ru/landing?utm=1', statusCode: 200 },
      ],
      patterns,
    );

    expect(result).toEqual({
      destinationHost: 'zaymer.ru',
      destinationUrl: 'zaymer.ru',
    });
  });

  it('returns empty when only tracker and short-link hosts remain', () => {
    const result = pickDestinationFromChain(
      [
        { url: 'https://sovtrk.ru/c/g5jo9?nc=1', statusCode: 303 },
        {
          url: 'https://goto.startracking.ru/api/v1/redirect?offer_id=1',
          statusCode: 200,
        },
      ],
      patterns,
    );

    expect(result).toEqual({});
  });
});
