require('dotenv').config();

const path = require('path');
const express = require('express');
const session = require('express-session');

const { initDb } = require('./models');
const { initRedis } = require('./config/redis');
const { startInactiveUsersMonitor, runInactiveUsersCheck } = require('./services/inactiveUsersService');
const webRoutes = require('./routes/web');
const apiRoutes = require('./routes/api');
const searchRoutes = require('./routes/search');

const cartMiddleware = require('./middleware/cartMiddleware');
const { sessionIdleTimeout, DEFAULT_USER_TIMEOUT } = require('./middleware/sessionTimeout');

const app = express();

// ================= VIEW ENGINE =================
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// ================= BODY PARSER =================
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ================= SESSION =================
app.use(
    session({
        secret: process.env.SESSION_SECRET || 'dev_secret',
        resave: false,
        saveUninitialized: false,
        rolling: true,
        cookie: {
            httpOnly: true,
            sameSite: 'lax',
            secure: String(process.env.SESSION_SECURE || process.env.NODE_ENV === 'production') === 'true',
            maxAge: DEFAULT_USER_TIMEOUT
        }
    })
);

// ================= MIDDLEWARE =================
app.use(sessionIdleTimeout);
app.use(cartMiddleware);

app.use((req, res, next) => {
    res.locals.currentUser = req.session.user || null;
    next();
});

// ================= ROUTES =================
app.use('/', webRoutes);
app.use('/api', apiRoutes);

app.use('/api/search', searchRoutes);

// ================= START SERVER =================
const port = process.env.PORT || 3000;

Promise.all([initDb(), initRedis()])
    .then(async () => {
        await runInactiveUsersCheck('startup');
        startInactiveUsersMonitor();

        app.listen(port, () => {
            console.log(`Server running on http://localhost:${port}`);
        });
    })
    .catch((err) => {
        console.error('DB init error:', err);
        process.exit(1);
    });