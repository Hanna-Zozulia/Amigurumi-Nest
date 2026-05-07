const { getModels } = require('../models');
const { formatDateRu } = require('../utils/dateFormatter');

const ALLOWED_STATUSES = new Set(['active', 'inactive', 'suspended']);

async function showInactiveUsers(req, res) {
    const { User } = getModels();

    const users = await User.findAll({
        where: {
            role: 'user'
        },
        attributes: ['id', 'name', 'email', 'status', 'lastLoginAt', 'createdAt'],
        order: [['id', 'ASC']]
    });

    const usersForView = users.map((user) => {
        const plain = user.get({ plain: true });

        return {
            ...plain,
            lastLoginAtFormatted: formatDateRu(plain.lastLoginAt, '—'),
            createdAtFormatted: formatDateRu(plain.createdAt, '—')
        };
    });

    return res.render('inactive_users', {
        title: 'Пользователи',
        users: usersForView,
        activeSection: 'users',
        allowedStatuses: Array.from(ALLOWED_STATUSES),
        updated: Boolean(req.query.updated),
        error: Boolean(req.query.error)
    });
}

async function updateUserStatus(req, res) {
    const { User } = getModels();
    const userId = Number(req.params.id);
    const nextStatus = String(req.body.status || '').trim().toLowerCase();

    if (!Number.isInteger(userId) || !ALLOWED_STATUSES.has(nextStatus)) {
        return res.redirect('/admin/users?error=1');
    }

    const user = await User.findByPk(userId);
    if (!user || user.role !== 'user') {
        return res.redirect('/admin/users?error=1');
    }

    const updatePayload = { status: nextStatus };

    await user.update(updatePayload);

    return res.redirect('/admin/users?updated=1');
}

module.exports = {
    showInactiveUsers,
    updateUserStatus
};
