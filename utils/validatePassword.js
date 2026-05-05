const COMMON_WEAK_PASSWORDS = new Set([
    '123456',
    '12345678',
    '123456789',
    'password',
    'password1',
    'qwerty',
    'qwerty123',
    'admin',
    'welcome',
    'letmein',
    'iloveyou',
    '111111',
    'abc123',
    '000000',
    '123123',
    'password123'
]);

function validatePassword(password) {
    const value = String(password || '');
    const trimmed = value.trim();
    const normalized = trimmed.toLowerCase();
    const errors = [];

    if (trimmed.length < 8) {
        errors.push('Пароль должен содержать минимум 8 символов.');
    }

    if (!/[A-Z]/.test(value)) {
        errors.push('Пароль должен содержать хотя бы одну заглавную букву.');
    }

    if (!/[a-z]/.test(value)) {
        errors.push('Пароль должен содержать хотя бы одну строчную букву.');
    }

    if (!/[0-9]/.test(value)) {
        errors.push('Пароль должен содержать хотя бы одну цифру.');
    }

    if (!/[^A-Za-z0-9]/.test(value)) {
        errors.push('Пароль должен содержать хотя бы один спецсимвол.');
    }

    if (COMMON_WEAK_PASSWORDS.has(normalized)) {
        errors.push('Пароль слишком простой и входит в список слабых паролей.');
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

module.exports = { validatePassword };