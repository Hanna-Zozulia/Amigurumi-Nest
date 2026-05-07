function normalizeImagePath(imagePath) {
    const value = String(imagePath || '').trim();

    if (!value) {
        return '';
    }

    if (/^(https?:)?\/\//i.test(value) || value.startsWith('data:')) {
        return value;
    }

    if (value.startsWith('/')) {
        return value;
    }

    if (value.startsWith('img/uploads/')) {
        return `/${value}`;
    }

    return `/img/${value.replace(/^\/+/, '')}`;
}

module.exports = {
    normalizeImagePath
};
