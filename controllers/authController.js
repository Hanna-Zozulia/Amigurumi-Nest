//authController.js
const bcrypt = require('bcryptjs');
const { getModels } = require('../models');

// GET /login
async function getLogin(req, res) {
    if (req.session.user) return res.redirect('/');
    const showError = Boolean(req.query.error);
    res.render('login', { title: 'Enter', showError });
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
        rule: user.rule
    };

    res.redirect('/');
}

// POST /logout
async function postLogout(req, res) {
    req.session.destroy(() => res.redirect('/'));
}

module.exports = { getLogin, postLogin, postLogout };