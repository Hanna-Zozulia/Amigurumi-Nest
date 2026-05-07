function toValidDate(value) {
    if (!value) return null;

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;

    return date;
}

function formatDateRu(value, fallback = '') {
    const date = toValidDate(value);
    if (!date) return fallback;

    return date.toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
}

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
