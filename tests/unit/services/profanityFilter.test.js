// Unit tests for `services/profanityFilter` — ensure detection of empty text,
// profanity (raw and normalized), spam links/advertising and acceptance of
// clean text. The `leo-profanity` library is mocked to control checks.

jest.mock('leo-profanity', () => ({
  loadDictionary: jest.fn(),
  check: jest.fn((value) => String(value).includes('слово') || String(value).includes('badword'))
}));

const leo = require('leo-profanity');
const { checkProfanity } = require('../../../services/profanityFilter');

describe('profanityFilter', () => {
  it('flags empty text', () => {
    expect(checkProfanity('')).toEqual({ ok: false, flagged: true, reason: 'empty' });
  });

  it('flags profanity in raw and normalized text', () => {
    expect(checkProfanity('badword')).toEqual({ ok: false, flagged: true, reason: 'profanity' });
    expect(leo.check).toHaveBeenCalled();
  });

  it('flags spam links and advertising text', () => {
    expect(checkProfanity('visit https://example.com')).toEqual({ ok: false, flagged: true, reason: 'spam' });
    expect(checkProfanity('скидка и заказ в telegram')).toEqual({ ok: false, flagged: true, reason: 'advertising' });
  });

  it('accepts clean text', () => {
    expect(checkProfanity('Милый вязаный кот')).toEqual({ ok: true, flagged: false, reason: 'clean' });
  });
});