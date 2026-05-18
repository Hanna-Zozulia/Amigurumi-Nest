const leo = require('leo-profanity');

leo.loadDictionary('en');
leo.loadDictionary('ru');

/**
 * Normalizes free-text for profanity checks by lowercasing and removing whitespace/special chars.
 */
function normalizeText(text) {
    return String(text || '')
        .toLowerCase()
        .replace(/\s+/g, '')
        .replace(/[^a-zа-я0-9]/gi, '');
}

/**
 * Checks the provided text for profanity, spam links, and advertising keywords.
 * Returns an object describing whether the text is ok and, if flagged, the reason.
 */
function checkProfanity(text) {
    const raw = String(text || '').trim();

    if (!raw) {
        return { ok: false, flagged: true, reason: 'empty' };
    }

    const normalized = normalizeText(raw);

    if (leo.check(normalized) || leo.check(raw.toLowerCase())) {
        return { ok: false, flagged: true, reason: 'profanity' };
    }

    if (/(https?:\/\/|www\.|\.com|\.ru|\.net)/i.test(raw)) {
        return { ok: false, flagged: true, reason: 'spam' };
    }

    if (/(telegram|instagram|subscribe|promo|скидк|акци|куп|заказ)/i.test(raw)) {
        return { ok: false, flagged: true, reason: 'advertising' };
    }

    return { ok: true, flagged: false, reason: 'clean' };
}

module.exports = { checkProfanity };