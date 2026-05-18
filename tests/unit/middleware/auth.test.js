const { requireAuth, requireAdmin, handleUnauthorized, handleForbidden } = require('../../../middleware/auth');
const { createMockRequest, createMockResponse, createMockNext } = require('../../helpers/testHelpers');

describe('Auth Middleware', () => {
  describe('requireAuth', () => {
    /**
     * Test: authenticated session should call `next()` and not redirect.
     */
    it('should allow authenticated user', () => {
      const req = createMockRequest({
        session: {
          user: { id: 1, name: 'Test User', role: 'user' },
          __expired: false
        }
      });
      const res = createMockResponse();
      const next = jest.fn();

      requireAuth(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.redirect).not.toHaveBeenCalled();
    });

    /**
     * Test: unauthenticated requests should be redirected to `/login`.
     */
    it('should redirect unauthenticated user to login', () => {
      const req = createMockRequest({
        session: { user: null }
      });
      const res = createMockResponse();
      const next = jest.fn();

      requireAuth(req, res, next);

      expect(res.redirect).toHaveBeenCalledWith('/login');
      expect(next).not.toHaveBeenCalled();
    });

    /**
     * Test: when session is marked expired middleware should destroy the
     * session, clear cookie and redirect to login with expired flag.
     */
    it('should destroy session and redirect when session expired', () => {
      const req = createMockRequest({
        session: {
          user: { id: 1, name: 'Test User' },
          __expired: true,
          destroy: jest.fn((cb) => cb && cb())
        }
      });
      const res = createMockResponse();
      const next = jest.fn();

      requireAuth(req, res, next);

      expect(req.session.destroy).toHaveBeenCalled();
      expect(res.clearCookie).toHaveBeenCalledWith('connect.sid');
      expect(res.redirect).toHaveBeenCalledWith('/login?expired=true');
    });
  });

  describe('requireAdmin', () => {
    /**
     * Test: admin users are allowed and `next()` is called.
     */
    it('should allow admin user', () => {
      const req = createMockRequest({
        session: {
          user: { id: 2, name: 'Admin', role: 'admin' },
          __expired: false
        }
      });
      const res = createMockResponse();
      const next = jest.fn();

      requireAdmin(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    /**
     * Test: regular users receive a 403 and a rendered forbidden page.
     */
    it('should deny regular user from admin access', () => {
      const req = createMockRequest({
        session: {
          user: { id: 1, name: 'User', role: 'user' },
          __expired: false
        }
      });
      const res = createMockResponse();
      const next = jest.fn();

      requireAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.render).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    /**
     * Test: unauthenticated attempts to access admin routes are redirected.
     */
    it('should redirect unauthenticated user to login', () => {
      const req = createMockRequest({
        session: { user: null }
      });
      const res = createMockResponse();
      const next = jest.fn();

      requireAdmin(req, res, next);

      expect(res.redirect).toHaveBeenCalledWith('/login');
      expect(next).not.toHaveBeenCalled();
    });

    /**
     * Test: expired admin sessions should be destroyed and redirected.
     */
    it('should destroy session for expired admin', () => {
      const req = createMockRequest({
        session: {
          user: { id: 2, name: 'Admin', role: 'admin' },
          __expired: true,
          destroy: jest.fn((cb) => cb && cb())
        }
      });
      const res = createMockResponse();
      const next = jest.fn();

      requireAdmin(req, res, next);

      expect(req.session.destroy).toHaveBeenCalled();
      expect(res.redirect).toHaveBeenCalledWith('/login?expired=true');
    });
  });

  describe('handleUnauthorized', () => {
    /**
     * Test: helper should redirect web requests to the login page.
     */
    it('should redirect to login for web request', () => {
      const req = createMockRequest();
      const res = createMockResponse();

      handleUnauthorized(req, res);

      expect(res.redirect).toHaveBeenCalledWith('/login');
    });
  });

  describe('handleForbidden', () => {
    /**
     * Test: helper should redirect web requests to the login page when access
     * is forbidden.
     */
    it('should redirect to login for web request', () => {
      const req = createMockRequest();
      const res = createMockResponse();

      handleForbidden(req, res);

      expect(res.redirect).toHaveBeenCalledWith('/login');
    });
  });
});
