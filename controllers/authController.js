//authController.js
const bcrypt = require('bcryptjs');
const { getModels } = require('../models');

// GET /login
async function getLogin(req, res) {
    if (req.session.user) return res.redirect('/');

    const showError = Boolean(req.query.error);

    res.render('login', {
        title: 'Enter',
        showError,
        type: 'login'
    });
}

// POST /login
async function postLogin(req, res) {
    const { User } = getModels();
    const { email, password } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) return res.redirect('/login?error=1');

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.redirect('/login?error=1');

    req.session.user = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
    };

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
        role: safeRole
    });

    req.session.user = {
        id: createdUser.id,
        name: createdUser.name,
        email: createdUser.email,
        role: createdUser.role
    };

    res.redirect('/');
}

// POST /logout
async function postLogout(req, res) {
    req.session.destroy(() => res.redirect('/'));
}

module.exports = { getLogin, postLogin, postRegister, postLogout };