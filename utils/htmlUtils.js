// utils/htmlUtils.js
// HTML and URL helper functions

function getSiteBaseUrl(req) {
    const configuredBaseUrl = String(process.env.APP_URL || process.env.BASE_URL || '').trim();
    if (configuredBaseUrl) {
        return configuredBaseUrl.replace(/\/$/, '');
    }

    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const host = req.get('host');

    return host ? `${protocol}://${host}` : '';
}

function getAbsoluteImageUrl(imagePath, baseUrl) {
    const value = String(imagePath || '').trim();
    if (!value) return '';

    if (/^(https?:)?\/\//i.test(value) || value.startsWith('data:')) {
        return value;
    }

    if (!baseUrl) {
        return value;
    }

    return `${baseUrl.replace(/\/$/, '')}/${value.replace(/^\//, '')}`;
}

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function getReviewErrorMessage(code) {
    const messages = {
        'empty': 'Комментарий не должен быть пустым.',
        'blocked': 'Комментарий не опубликован: текст нарушает правила публикации.'
    };
    
    return messages[code] || null;
}

module.exports = {
    getSiteBaseUrl,
    getAbsoluteImageUrl,
    escapeHtml,
    getReviewErrorMessage
};
