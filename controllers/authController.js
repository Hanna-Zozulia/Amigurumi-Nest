//authController.js
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { Op } = require('sequelize');
const { getModels } = require('../models');

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

function buildSiteBaseUrl(req) {
    const configuredBaseUrl = String(process.env.APP_URL || process.env.BASE_URL || '').trim();
    if (configuredBaseUrl) {
        return configuredBaseUrl.replace(/\/$/, '');
    }

    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const host = req.get('host');

    return host ? `${protocol}://${host}` : '';
}

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

async function sendResetPasswordEmail({ email, resetLink }) {
    const transporter = getMailTransporter();
    const from = process.env.MAIL_FROM || process.env.MAIL_USER;

    if (!transporter || !from) {
        console.warn('[auth] MAIL_* settings are missing. Password reset link:', resetLink);
        return;
    }

    await transporter.sendMail({
        from,
        to: email,
        subject: 'Восстановление пароля',
        text: [
            'Вы запросили восстановление пароля.',
            '',
            'Перейдите по ссылке для установки нового пароля:',
            resetLink,
            '',
            'Ссылка действительна 1 час. Если это были не вы, просто проигнорируйте письмо.'
        ].join('\n'),
        html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #1b1b1b;">
              <h2 style="margin: 0 0 12px;">Восстановление пароля</h2>
              <p style="margin: 0 0 12px;">Вы запросили восстановление пароля в аккаунте Amigurumi Nest.</p>
              <p style="margin: 0 0 18px;">Ссылка действительна 1 час.</p>
              <p style="margin: 0 0 18px;">
                <a href="${resetLink}" style="display:inline-block;padding:10px 16px;background:#20311e;color:#ffffff;text-decoration:none;border-radius:8px;">Сбросить пароль</a>
              </p>
              <p style="margin: 0; font-size: 13px; color: #5f5f5f;">Если это были не вы, просто проигнорируйте это письмо.</p>
            </div>
        `
    });
}

function buildResetTokenPayload() {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

    return { rawToken, tokenHash, expiresAt };
}

function hashResetToken(token) {
    return crypto.createHash('sha256').update(String(token || '')).digest('hex');
}

async function mergeSessionCartIntoUser(req, userId) {
    const { Cart, CartItem } = getModels();
    const sessionItems = Array.isArray(req.session.cart?.items) ? req.session.cart.items : [];

    if (sessionItems.length === 0) {
        return;
    }

    let cart = await Cart.findOne({ where: { userId } });
    if (!cart) {
        cart = await Cart.create({ userId });
    }

    for (const sessionItem of sessionItems) {
        const productId = Number(sessionItem.productId);
        const quantityToAdd = Number(sessionItem.quantity) || 0;

        if (!productId || quantityToAdd <= 0) {
            continue;
        }

        const existingItem = await CartItem.findOne({
            where: { cartId: cart.id, productId }
        });

        if (existingItem) {
            existingItem.quantity += quantityToAdd;
            await existingItem.save();
        } else {
            await CartItem.create({
                cartId: cart.id,
                productId,
                quantity: quantityToAdd
            });
        }
    }

    req.session.cart = { items: [] };
}

// GET /login
async function getLogin(req, res) {
    if (req.session.user) return res.redirect('/');

    const showError = Boolean(req.query.error);
    const resetSuccess = Boolean(req.query.reset);

    res.render('login', {
        title: 'Enter',
        showError,
        resetSuccess,
        type: 'login'
    });
}

// GET /forgot-password
async function getForgotPassword(req, res) {
    res.render('forgot_password', {
        title: 'Восстановление пароля',
        sent: Boolean(req.query.sent)
    });
}

// POST /forgot-password
async function postForgotPassword(req, res) {
    const { User } = getModels();
    const normalizedEmail = String(req.body.email || '').trim().toLowerCase();

    try {
        if (normalizedEmail) {
            const user = await User.findOne({ where: { email: normalizedEmail } });

            if (user) {
                const { rawToken, tokenHash, expiresAt } = buildResetTokenPayload();

                await user.update({
                    resetToken: tokenHash,
                    resetTokenExp: expiresAt
                });

                const baseUrl = buildSiteBaseUrl(req);
                const resetLink = `${baseUrl}/reset-password/${encodeURIComponent(rawToken)}`;

                await sendResetPasswordEmail({
                    email: user.email,
                    resetLink
                });
            }
        }
    } catch (err) {
        console.error('[auth] postForgotPassword error:', err.message);
    }

    return res.redirect('/forgot-password?sent=1');
}

// GET /reset-password/:token
async function getResetPassword(req, res) {
    const { User } = getModels();
    const token = String(req.params.token || '');

    if (!token) {
        return res.render('reset_password', {
            title: 'Сброс пароля',
            token: '',
            showError: false,
            invalidToken: true
        });
    }

    const tokenHash = hashResetToken(token);

    const user = await User.findOne({
        where: {
            resetToken: tokenHash,
            resetTokenExp: { [Op.gt]: new Date() }
        }
    });

    return res.render('reset_password', {
        title: 'Сброс пароля',
        token,
        showError: Boolean(req.query.error),
        invalidToken: !user
    });
}

// POST /reset-password/:token
async function postResetPassword(req, res) {
    const { User } = getModels();
    const token = String(req.params.token || '');
    const { password, confirm_password: confirmPassword } = req.body;

    if (!token) {
        return res.render('reset_password', {
            title: 'Сброс пароля',
            token: '',
            showError: true,
            invalidToken: true
        });
    }

    if (!password || password.length < 6 || password !== confirmPassword) {
        return res.redirect(`/reset-password/${encodeURIComponent(token)}?error=1`);
    }

    const tokenHash = hashResetToken(token);

    const user = await User.findOne({
        where: {
            resetToken: tokenHash,
            resetTokenExp: { [Op.gt]: new Date() }
        }
    });

    if (!user) {
        return res.render('reset_password', {
            title: 'Сброс пароля',
            token: '',
            showError: false,
            invalidToken: true
        });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await user.update({
        password: hashedPassword,
        resetToken: null,
        resetTokenExp: null
    });

    return res.redirect('/login?reset=1');
}

// POST /login
async function postLogin(req, res) {
    const { User } = getModels();
    const { email, password } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();

    const user = await User.findOne({ where: { email: normalizedEmail } });
    if (!user) return res.redirect('/login?error=1');

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.redirect('/login?error=1');

    await user.update({
        lastLoginAt: new Date(),
        status: 'active'
    });

    req.session.user = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
    };

    await mergeSessionCartIntoUser(req, user.id);

    res.redirect('/');
}

// POST /register
async function postRegister(req, res) {
    const { User } = getModels();
    const { name, email, password, confirm_password } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (!name || !normalizedEmail || !password || !confirm_password) {
        return res.redirect('/register?error=1');
    }

    if (password !== confirm_password) {
        return res.redirect('/register?error=1');
    }

    const safeRole = 'user';

    const existingUser = await User.findOne({ where: { email: normalizedEmail } });
    if (existingUser) {
        return res.redirect('/register?error=1');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const createdUser = await User.create({
        name: String(name).trim(),
        email: normalizedEmail,
        password: hashedPassword,
        lastLoginAt: new Date(),
        status: 'active',
        role: safeRole
    });

    req.session.user = {
        id: createdUser.id,
        name: createdUser.name,
        email: createdUser.email,
        role: createdUser.role
    };

    await mergeSessionCartIntoUser(req, createdUser.id);

    res.redirect('/');
}

// POST /logout
async function postLogout(req, res) {
    if (!req.session) {
        return res.redirect('/');
    }

    req.session.destroy((err) => {
        if (err) {
            return res.redirect('/');
        }

        res.clearCookie('connect.sid');
        return res.redirect('/');
    });
}

module.exports = {
    getLogin,
    postLogin,
    postRegister,
    postLogout,
    getForgotPassword,
    postForgotPassword,
    getResetPassword,
    postResetPassword
};