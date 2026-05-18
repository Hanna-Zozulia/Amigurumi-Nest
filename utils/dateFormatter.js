/**
 * Returns a valid Date object for a given input or null when invalid.
 */
function toValidDate(value) {
    if (!value) return null;

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;

    return date;
}

/**
 * Formats a value as a Russian locale date string (DD.MM.YYYY).
 * Returns `fallback` if the value is not a valid date.
 */
function formatDateRu(value, fallback = '') {
    const date = toValidDate(value);
    if (!date) return fallback;

    return date.toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
}

/**
 * Formats a value as a Russian locale date and time string.
 * Returns `fallback` if the value is not a valid date.
 */
function formatDateTimeRu(value, fallback = '') {
    const date = toValidDate(value);
    if (!date) return fallback;

    return date.toLocaleString('ru-RU', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

module.exports = {
    formatDateRu,
    formatDateTimeRu
};
