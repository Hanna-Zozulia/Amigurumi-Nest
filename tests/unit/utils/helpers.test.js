// Unit tests for various utility helper modules under `utils/`.
// These tests ensure helper functions behave correctly for common cases
// and edge inputs (password validation, HTML helpers, date formatting,
// and image path normalization).

const { validatePassword } = require('../../../utils/validatePassword');
const { getSiteBaseUrl, getAbsoluteImageUrl, escapeHtml, getReviewErrorMessage } = require('../../../utils/htmlUtils');
const { formatDateRu, formatDateTimeRu } = require('../../../utils/dateFormatter');
const { normalizeImagePath } = require('../../../utils/imagePath');

describe('Utility helpers', () => {
  /**
   * validatePassword: verifies password strength rules and returns an
   * object `{ valid, errors }` with localized error messages.
   */
  describe('validatePassword', () => {
    it('rejects weak passwords with all validation errors', () => {
      const result = validatePassword('password');

      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(expect.arrayContaining([
        'Пароль должен содержать хотя бы одну заглавную букву.',
        'Пароль должен содержать хотя бы одну цифру.',
        'Пароль должен содержать хотя бы один спецсимвол.',
        'Пароль слишком простой и входит в список слабых паролей.'
      ]));
    });

    it('accepts a strong password', () => {
      const result = validatePassword('StrongPass123!');

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });

  /**
   * htmlUtils: base URL, image URL helpers and HTML escaping helpers.
   */
  describe('htmlUtils', () => {
    const originalAppUrl = process.env.APP_URL;
    const originalBaseUrl = process.env.BASE_URL;

    afterEach(() => {
      process.env.APP_URL = originalAppUrl;
      process.env.BASE_URL = originalBaseUrl;
    });

    it('builds base url from env and request', () => {
      process.env.APP_URL = '';
      process.env.BASE_URL = '';

      const req = {
        protocol: 'https',
        headers: {},
        get: jest.fn(() => 'example.com')
      };

      expect(getSiteBaseUrl(req)).toBe('https://example.com');
    });

    it('prefers configured base url and trims trailing slash', () => {
      process.env.APP_URL = 'https://shop.test/';
      process.env.BASE_URL = '';

      expect(getSiteBaseUrl({ get: jest.fn() })).toBe('https://shop.test');
    });

    it('normalizes image urls', () => {
      expect(getAbsoluteImageUrl('img/a.png', 'https://shop.test/')).toBe('https://shop.test/img/a.png');
      expect(getAbsoluteImageUrl('https://cdn.test/a.png', 'https://shop.test')).toBe('https://cdn.test/a.png');
      expect(getAbsoluteImageUrl('data:image/png;base64,abc', 'https://shop.test')).toBe('data:image/png;base64,abc');
      expect(getAbsoluteImageUrl('', 'https://shop.test')).toBe('');
    });

    it('escapes html and maps review errors', () => {
      expect(escapeHtml(`<a href="x">'&</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;&#39;&amp;&lt;/a&gt;');
      expect(getReviewErrorMessage('empty')).toContain('Комментарий не должен быть пустым');
      expect(getReviewErrorMessage('blocked')).toContain('не опубликован');
      expect(getReviewErrorMessage('other')).toBeNull();
    });
  });

  /**
   * dateFormatter: format dates in Russian locale; verify fallback behavior
   * for invalid inputs.
   */
  describe('dateFormatter', () => {
    it('formats valid dates and returns fallback for invalid input', () => {
      const value = new Date('2024-01-15T10:20:00Z');

      expect(formatDateRu(value)).toMatch(/15\.01\.2024|15\/01\/2024/);
      expect(formatDateTimeRu(value)).toMatch(/15\.01\.2024|15\/01\/2024/);
      expect(formatDateRu(null, '—')).toBe('—');
      expect(formatDateTimeRu('bad-date', 'fallback')).toBe('fallback');
    });
  });

  /**
   * imagePath: normalize various image path formats into canonical public
   * URLs used by the app.
   */
  describe('imagePath', () => {
    it('normalizes relative and absolute paths', () => {
      expect(normalizeImagePath('')).toBe('');
      expect(normalizeImagePath('/img/uploads/test.png')).toBe('/img/uploads/test.png');
      expect(normalizeImagePath('img/uploads/test.png')).toBe('/img/uploads/test.png');
      expect(normalizeImagePath('uploads/test.png')).toBe('/img/uploads/test.png');
      expect(normalizeImagePath('https://cdn.test/a.png')).toBe('https://cdn.test/a.png');
    });
  });
});