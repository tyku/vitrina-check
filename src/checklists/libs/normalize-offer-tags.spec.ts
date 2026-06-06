import {
  normalizeOfferTagValue,
  normalizeOfferTags,
  parseOfferTagsFromText,
} from './normalize-offer-tags';

describe('normalizeOfferTags', () => {
  it('lowercases and dedupes', () => {
    const result = normalizeOfferTags(['Sravni', 'sravni', 'startracking']);
    expect(result).toEqual({
      ok: true,
      tags: ['sravni', 'startracking'],
    });
  });

  it('rejects invalid characters', () => {
    const result = normalizeOfferTags(['bad tag']);
    expect(result.ok).toBe(false);
  });
});

describe('normalizeOfferTagValue', () => {
  it('accepts domain-like tag', () => {
    expect(normalizeOfferTagValue('startracker.ru')).toBe('startracker.ru');
  });
});

describe('parseOfferTagsFromText', () => {
  it('splits by comma', () => {
    expect(parseOfferTagsFromText('sravni, startracking')).toEqual([
      'sravni',
      'startracking',
    ]);
  });
});
