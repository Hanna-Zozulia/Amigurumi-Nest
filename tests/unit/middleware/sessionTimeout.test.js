const { sessionIdleTimeout, DEFAULT_USER_TIMEOUT, ADMIN_TIMEOUT } = require('../../../middleware/sessionTimeout');
const { createMockRequest, createMockResponse, createMockNext } = require('../../helpers/testHelpers');

describe('Session Timeout Middleware', () => {
  const mockNext = createMockNext();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  /**
   * Test: when there is no authenticated user, middleware should simply
   * pass through without affecting the request.
   */
  it('should pass through if no session user', () => {
    const req = createMockRequest({ session: { user: null } });
    const res = createMockResponse();
    const next = jest.fn();

    sessionIdleTimeout(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  /**
   * Test: when the user is active, the middleware updates `session.lastActivity`
   * to the current time and calls `next()`.
   */
  it('should update lastActivity for active user', () => {
    const currentTime = Date.now();
    jest.setSystemTime(currentTime);

    const req = createMockRequest({
      session: {
        user: { id: 1, name: 'Test' },
        lastActivity: currentTime - 5 * 60 * 1000,
        cookie: { maxAge: DEFAULT_USER_TIMEOUT }
      }
    });
    const res = createMockResponse();
    const next = jest.fn();

    sessionIdleTimeout(req, res, next);

    expect(req.session.lastActivity).toBe(currentTime);
    expect(next).toHaveBeenCalled();
  });

  /**
   * Test: when idle period exceeds configured timeout, the session should be
   * marked expired via `__expired` flag.
   */
  it('should set __expired flag when user timeout exceeded', () => {
    const currentTime = Date.now();
    jest.setSystemTime(currentTime);

    const req = createMockRequest({
      session: {
        user: { id: 1, name: 'Test', role: 'user' },
        lastActivity: currentTime - DEFAULT_USER_TIMEOUT - 1000,
        cookie: { maxAge: DEFAULT_USER_TIMEOUT }
      }
    });
    const res = createMockResponse();
    const next = jest.fn();

    sessionIdleTimeout(req, res, next);

    expect(req.session.__expired).toBe(true);
    expect(next).toHaveBeenCalled();
  });

  /**
   * Test: admin users have a separate (shorter) timeout and the middleware
   * should mark their session expired accordingly.
   */
  it('should apply different timeout for admin users', () => {
    const currentTime = Date.now();
    jest.setSystemTime(currentTime);

    // Admin timeout is shorter, so set lastActivity earlier
    const timePassed = ADMIN_TIMEOUT + 1000; // Just exceeded admin timeout
    
    const req = createMockRequest({
      session: {
        user: { id: 2, name: 'Admin', role: 'admin' },
        lastActivity: currentTime - timePassed,
        cookie: { maxAge: DEFAULT_USER_TIMEOUT }
      }
    });
    const res = createMockResponse();
    const next = jest.fn();

    sessionIdleTimeout(req, res, next);

    expect(req.session.__expired).toBe(true);
    expect(req.session.cookie.maxAge).toBe(ADMIN_TIMEOUT);
  });

  /**
   * Test: middleware keeps `session.cookie.maxAge` synchronized with the
   * role-specific timeout (e.g., admin vs regular user).
   */
  it('should sync cookie maxAge with user role', () => {
    const currentTime = Date.now();
    jest.setSystemTime(currentTime);

    const req = createMockRequest({
      session: {
        user: { id: 2, name: 'Admin', role: 'admin' },
        lastActivity: currentTime - 5 * 60 * 1000,
        cookie: { maxAge: DEFAULT_USER_TIMEOUT }
      }
    });
    const res = createMockResponse();
    const next = jest.fn();

    sessionIdleTimeout(req, res, next);

    expect(req.session.cookie.maxAge).toBe(ADMIN_TIMEOUT);
  });
});
