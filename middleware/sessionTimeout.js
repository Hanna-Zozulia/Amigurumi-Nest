const DEFAULT_USER_TIMEOUT = Number(process.env.SESSION_IDLE_TIMEOUT_MS || 30 * 60 * 1000);
const ADMIN_TIMEOUT = Number(process.env.ADMIN_SESSION_IDLE_TIMEOUT_MS || 15 * 60 * 1000);

/**
 * Returns the idle timeout that applies to the current session role.
 */
function getSessionTimeout(req) {
    const role = req.session?.user?.role;

    if (role === 'admin') {
        return ADMIN_TIMEOUT;
    }

    return DEFAULT_USER_TIMEOUT;
}

/**
 * Marks authenticated sessions as expired after inactivity and refreshes activity timestamps.
 */
function sessionIdleTimeout(req, res, next) {
    if (!req.session || !req.session.user) {

        return next();
    }

    const now = Date.now();
    const timeout = getSessionTimeout(req);

    const lastActivity = Number(req.session.lastActivity || 0);

    const isExpired =
        lastActivity && (now - lastActivity >= timeout);

    if (isExpired) {
        req.session.__expired = true;

        // Keep the cookie lifetime aligned with the session timeout.
        req.session.cookie.maxAge = timeout;
    
        return next();
    }

    // Record the current activity timestamp.
    req.session.lastActivity = now;

    // Keep the cookie lifetime aligned with the session timeout.
    req.session.cookie.maxAge = timeout;

    return next();
}

module.exports = {
    DEFAULT_USER_TIMEOUT,
    ADMIN_TIMEOUT,
    sessionIdleTimeout
};