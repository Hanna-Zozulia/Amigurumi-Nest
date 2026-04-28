const nodemailer = require('nodemailer');
const { Op } = require('sequelize');
const { getModels } = require('../models');

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;

let monitorTimer = null;

function getMailTransporter() {
    const host = process.env.MAIL_HOST;
    const port = Number(process.env.MAIL_PORT || 587);
    const secure = String(process.env.MAIL_SECURE || 'false') === 'true';
    const user = process.env.MAIL_USER;
    const pass = process.env.MAIL_PASS;
    const service = process.env.MAIL_SERVICE || 'gmail';

    if (host && user && pass) {
        return nodemailer.createTransport({
            host,
            port,
            secure,
            auth: { user, pass }
        });
    }

    if (user && pass) {
        return nodemailer.createTransport({
            service,
            auth: { user, pass }
        });
    }

    return null;
}

async function sendInactiveStatusNotification(user) {
    const transporter = getMailTransporter();
    const from = process.env.MAIL_FROM || process.env.MAIL_USER;

    if (!transporter || !from) {
        console.warn(`[inactive-users] Mail not configured. Skip status change for user ${user.email}`);
        return false;
    }

    await transporter.sendMail({
        from,
        to: user.email,
        subject: 'Статус аккаунта изменен на inactive',
        text: [
            `Здравствуйте, ${user.name || 'пользователь'}!`,
            '',
            'Вы не входили в аккаунт более 1 года.',
            'Ваш статус автоматически изменен на inactive.',
            '',
            'Чтобы снова активировать профиль, выполните вход в аккаунт или обратитесь к администратору.'
        ].join('\n'),
        html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #1b1b1b;">
              <h2 style="margin: 0 0 12px;">Статус аккаунта обновлен</h2>
              <p style="margin: 0 0 10px;">Здравствуйте, ${user.name || 'пользователь'}.</p>
              <p style="margin: 0 0 10px;">Вы не входили в аккаунт более 1 года.</p>
              <p style="margin: 0 0 10px;">Ваш статус автоматически изменен на <b>inactive</b>.</p>
              <p style="margin: 0;">Чтобы снова активировать профиль, войдите в аккаунт или обратитесь к администратору.</p>
            </div>
        `
    });

    return true;
}

function buildInactivityWhere(cutoffDate) {
    return {
        role: 'user',
        status: { [Op.ne]: 'inactive' },
        [Op.or]: [
            { lastLoginAt: { [Op.lte]: cutoffDate } },
            {
                [Op.and]: [
                    { lastLoginAt: null },
                    { createdAt: { [Op.lte]: cutoffDate } }
                ]
            }
        ]
    };
}

async function deactivateInactiveUsers() {
    const models = getModels();
    if (!models || !models.User) {
        return { checked: 0, deactivated: 0 };
    }

    const { User } = models;
    const cutoffDate = new Date(Date.now() - ONE_YEAR_MS);

    const candidates = await User.findAll({
        where: buildInactivityWhere(cutoffDate),
        attributes: ['id', 'name', 'email', 'lastLoginAt', 'status', 'createdAt']
    });

    let deactivated = 0;

    for (const user of candidates) {
        try {
            const notified = await sendInactiveStatusNotification(user);
            if (!notified) continue;

            await user.update({ status: 'inactive' });
            deactivated += 1;
        } catch (err) {
            console.error(`[inactive-users] Failed processing user ${user.id}:`, err.message);
        }
    }

    return { checked: candidates.length, deactivated };
}

async function runInactiveUsersCheck(context) {
    try {
        const { checked, deactivated } = await deactivateInactiveUsers();
        const reason = context || 'scheduled';
        console.log(`[inactive-users] ${reason}: checked=${checked}, deactivated=${deactivated}`);
    } catch (err) {
        console.error('[inactive-users] Check failed:', err.message);
    }
}

function startInactiveUsersMonitor() {
    if (monitorTimer) return;

    monitorTimer = setInterval(() => {
        void runInactiveUsersCheck('interval');
    }, CHECK_INTERVAL_MS);

    console.log(`[inactive-users] Monitor started. Interval: ${CHECK_INTERVAL_MS} ms`);
}

module.exports = {
    startInactiveUsersMonitor,
    runInactiveUsersCheck
};
