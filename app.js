require('dotenv').config();

const path = require('path');
const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const { Op } = require('sequelize');

const { initDb } = require('./models');
const { initRedis } = require('./config/redis');
const { startInactiveUsersMonitor, runInactiveUsersCheck } = require('./services/inactiveUsersService');
const webRoutes = require('./routes/web');
const apiRoutes = require('./routes/api');
const searchRoutes = require('./routes/search');

const cartMiddleware = require('./middleware/cartMiddleware');
const { sessionIdleTimeout, DEFAULT_USER_TIMEOUT } = require('./middleware/sessionTimeout');
const { normalizeImagePath } = require('./utils/imagePath');
const { getModels } = require('./models');

const app = express();

/**
 * Main Express application instance for the Amigurumi Nest server.
 * This file wires middleware, routes, and initializes background services.
 */

// SECURITY: require a session secret, fail fast if missing
if (!process.env.SESSION_SECRET) {
    console.error('FATAL: SESSION_SECRET is not set. Set it in your .env and restart.');
    process.exit(1);
}
// ================= VIEW ENGINE =================
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// ================= BODY PARSER =================
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// SECURITY: basic HTTP headers
app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],

                scriptSrc: [
                    "'self'",
                    "'unsafe-inline'",
                    "https://cdn.jsdelivr.net",
                    "https://fonts.googleapis.com"
                ],

                styleSrc: [
                    "'self'",
                    "'unsafe-inline'",
                    "https://cdn.jsdelivr.net",
                    "https://fonts.googleapis.com"
                ],

                fontSrc: [
                    "'self'",
                    "https://cdn.jsdelivr.net",
                    "https://fonts.gstatic.com"
                ],

                imgSrc: [
                    "'self'",
                    "data:",
                    "blob:"
                ],

                connectSrc: [
                    "'self'",
                    "https://cdn.jsdelivr.net"
                ]
            }
        }
    })
);

// ================= SESSION =================
app.use(
    session({
        secret: process.env.SESSION_SECRET,
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

/**
 * Middleware: expose a `sessionExpired` flag to views when the session was
 * marked as expired by server-side session timeout handling.
 */
app.use((req, res, next) => {
    res.locals.sessionExpired = !!req.session?.__expired;
    next();
});

/**
 * Middleware: expose common view helpers and current user information to
 * templates via `res.locals` (e.g. `currentUser`, `normalizeImagePath`).
 */
app.use((req, res, next) => {
    res.locals.currentUser = req.session.user || null;
    res.locals.normalizeImagePath = normalizeImagePath;
    res.locals.adminReviewBadgeCount = 0;
    next();
});

/**
 * Middleware: when an admin visits admin routes, compute the number of new
 * reviews since the admin's last visit and expose it as
 * `res.locals.adminReviewBadgeCount` for the admin UI badge.
 */
app.use(async (req, res, next) => {
    if (!req.session.user || req.session.user.role !== 'admin' || !req.originalUrl.startsWith('/admin')) {
        return next();
    }

    try {
        const models = getModels();
        if (!models) {
            return next();
        }

        const { Review } = models;
        const lastAdminVisitAt = req.session.adminCommentsLastVisitAt
            ? new Date(req.session.adminCommentsLastVisitAt)
            : null;

        if (!lastAdminVisitAt || Number.isNaN(lastAdminVisitAt.getTime())) {
            res.locals.adminReviewBadgeCount = 0;
            return next();
        }

        const rawCount = await Review.count({
            where: {
                createdAt: {
                    [Op.gt]: lastAdminVisitAt
                }
            }
        });

        const normalizedCount = Number(rawCount);
        res.locals.adminReviewBadgeCount = Number.isFinite(normalizedCount) && normalizedCount > 0
            ? normalizedCount
            : 0;
    } catch (err) {
        console.error('adminReviewBadgeCount error:', err.message);
        res.locals.adminReviewBadgeCount = 0;
    }

    next();
});

// ================= CART MIDDLEWARE =================
/**
 * Cart middleware: attaches cart-related helpers and state to the request
 * (populates `req.cart` / synchronizes session cart state).
 */
app.use(cartMiddleware);

// ================= ROUTES =================
/**
 * Route mounting: mount web, API and search routers under their prefixes.
 */
app.use('/', webRoutes);
app.use('/api', apiRoutes);

app.use('/api/search', searchRoutes);
// Swagger UI
const swaggerRouter = require('./swagger/swagger');
app.use('/api-docs', swaggerRouter);

/**
 * 404 handler: render a friendly 404 page for unknown routes.
 */
app.use((req, res) => res.status(404).render('404', { title: '404 - Страница не найдена', sessionExpired: false }));

// ================= START SERVER =================
const port = process.env.PORT || 3000;

/**
 * Startup sequence: initialize DB and Redis, run one-off inactive-users check,
 * start the background monitor and then start the HTTP server.
 */
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