//profanityFilter.js
const leo = require('leo-profanity');

leo.loadDictionary('en');
leo.loadDictionary('ru');

function normalizeText(text) {
    return String(text || '')
        .toLowerCase()
        .replace(/\s+/g, '')
        .replace(/[^a-zа-я0-9]/gi, '');
}

function checkProfanity(text) {
    const raw = String(text || '').trim();

    if (!raw) {
        return { ok: false, flagged: true, reason: 'empty' };
    }

    const normalized = normalizeText(raw);

    // мат
    if (leo.check(normalized) || leo.check(raw.toLowerCase())) {
        return { ok: false, flagged: true, reason: 'profanity' };
    }

    // ссылки
    if (/(https?:\/\/|www\.|\.com|\.ru|\.net)/i.test(raw)) {
        return { ok: false, flagged: true, reason: 'spam' };
    }

    // реклама
    if (/(telegram|instagram|subscribe|promo|скидк|акци|куп|заказ)/i.test(raw)) {
        return { ok: false, flagged: true, reason: 'advertising' };
    }

    return { ok: true, flagged: false, reason: 'clean' };
}

module.exports = { checkProfanity };