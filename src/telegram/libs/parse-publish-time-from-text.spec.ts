import { parsePublishTimeFromText } from './parse-publish-time-from-text';

describe('parsePublishTimeFromText', () => {
  it('parses valid HH:MM', () => {
    expect(parsePublishTimeFromText('10:00')).toBe('10:00');
    expect(parsePublishTimeFromText('9:05')).toBe('09:05');
    expect(parsePublishTimeFromText(' 23:59 ')).toBe('23:59');
  });

  it('rejects invalid values', () => {
    expect(parsePublishTimeFromText('24:00')).toBeNull();
    expect(parsePublishTimeFromText('10:60')).toBeNull();
    expect(parsePublishTimeFromText('ten')).toBeNull();
  });
});
