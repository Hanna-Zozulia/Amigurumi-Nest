/**
 * Create a minimal mock Express `req` object for unit tests.
 * Accepts an `overrides` object to customize session, body, params, etc.
 */
const createMockRequest = (overrides = {}) => ({
  session: {
  user: {
    id: 1,
    name: 'Test User',
    email: 'test@example.com',
    role: 'user'
    },
    cart: { items: [] },
    lastActivity: Date.now(),
    destroy: jest.fn((cb) => cb && cb()),
    ...overrides.session
  },
  body: overrides.body || {},
  query: overrides.query || {},
  params: overrides.params || {},
  headers: overrides.headers || {},
  cookies: overrides.cookies || {},
  method: overrides.method || 'GET',
  baseUrl: overrides.baseUrl || '',
  path: overrides.path || '/',
  originalUrl: overrides.originalUrl || '/',
  files: overrides.files || {},
  ...overrides
});

/**
 * Create a mock Express `res` object with commonly used response helpers
 * (`status`, `json`, `send`, `render`, `redirect`, `cookie`, etc.) mocked
 * via `jest.fn` so tests can assert calls and captured values.
 */
const createMockResponse = (overrides = {}) => {
  const res = {
    status: jest.fn(function(code) {
      this.statusCode = code;
      return this;
    }),
    json: jest.fn(function(data) {
      this.jsonData = data;
      return this;
    }),
    send: jest.fn(function(data) {
      this.sendData = data;
      return this;
    }),
    render: jest.fn(function(template, data) {
      this.renderedTemplate = template;
      this.renderedData = data;
      return this;
    }),
    redirect: jest.fn(function(url) {
      this.redirectUrl = url;
      return this;
    }),
    clearCookie: jest.fn(function(name) {
      return this;
    }),
    cookie: jest.fn(function(name, value, options) {
      return this;
    }),
    locals: {},
    statusCode: 200,
    ...overrides
  };
  return res;
};

/**
 * Create a mock `next` function for middleware tests.
 */
const createMockNext = () => jest.fn();

/**
 * Helper: create a mock request object pre-populated with an authenticated
 * `session.user`. Accepts an optional `user` override.
 */
const createAuthenticatedRequest = (user = null) => {
  return createMockRequest({
    session: {
      user: user || {
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        role: 'user'
      },
      cart: { items: [] },
      lastActivity: Date.now(),
      destroy: jest.fn((cb) => cb && cb())
    }
  });
};

/**
 * Helper: create a mock request object representing an admin user session.
 * Accepts `overrides` to customize returned object.
 */
const createAdminRequest = (overrides = {}) => ({
  session: {
    user: {
      id: 2,
      name: 'Admin User',
      email: 'admin@test.com',
      role: 'admin'
    },
    cart: { items: [] },
    lastActivity: Date.now(),
    destroy: jest.fn((cb) => cb && cb()),
    ...overrides.session
  },
  ...overrides
});

module.exports = {
  createMockRequest,
  createMockResponse,
  createMockNext,
  createAuthenticatedRequest,
  createAdminRequest
};
