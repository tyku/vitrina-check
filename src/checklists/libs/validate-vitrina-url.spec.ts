import { validateVitrinaUrl } from './validate-vitrina-url';
import { extractUrlFromText } from './extract-url-from-text';

describe('validateVitrinaUrl', () => {
  it('accepts https URL', () => {
    const result = validateVitrinaUrl('https://kredya.ru/');
    expect(result).toEqual({ ok: true, href: 'https://kredya.ru/' });
  });

  it('rejects localhost', () => {
    const result = validateVitrinaUrl('http://localhost/test');
    expect(result.ok).toBe(false);
  });
});

describe('extractUrlFromText', () => {
  it('extracts first URL from message', () => {
    expect(
      extractUrlFromText('добавь https://example.com/path пожалуйста'),
    ).toBe('https://example.com/path');
  });
});
