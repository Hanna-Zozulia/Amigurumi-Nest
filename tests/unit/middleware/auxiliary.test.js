let capturedRateLimitOptions;
let capturedUploadOptions;
let capturedDiskStorageOptions;

jest.mock('express-rate-limit', () => {
  const mockRateLimit = jest.fn((options) => {
    capturedRateLimitOptions = options;
    return options;
  });

  mockRateLimit.rateLimit = mockRateLimit;
  mockRateLimit.ipKeyGenerator = jest.fn((ip) => `ip:${ip}`);

  return mockRateLimit;
});

jest.mock('multer', () => {
  const multerMock = jest.fn((options) => {
    capturedUploadOptions = options;
    return {
      single: jest.fn(() => 'single-middleware'),
      fields: jest.fn(() => 'fields-middleware')
    };
  });

  multerMock.diskStorage = jest.fn((options) => {
    capturedDiskStorageOptions = options;
    return { options };
  });

  /**
   * Minimal MulterError class used in tests to simulate multer failures.
   * Extends `Error` and carries a `code` property to emulate real Multer errors.
   */
  multerMock.MulterError = class MulterError extends Error {
    constructor(code) {
      super(code);
      this.code = code;
    }
  };

  return multerMock;
});

const { createMockRequest, createMockResponse } = require('../../helpers/testHelpers');

const cartMiddleware = require('../../../middleware/cartMiddleware');
const { reviewRateLimit } = require('../../../middleware/reviewSecurity');
const rateLimits = require('../../../middleware/rateLimits');
const uploadMiddleware = require('../../../middleware/uploadMiddleware');

describe('Auxiliary middleware', () => {
  describe('cartMiddleware', () => {
    /**
     * Test: when session has no cart, cartMiddleware should supply an empty
     * cart object to `res.locals.cart` and call `next()`.
     */
    it('sets empty cart when session cart is missing', () => {
      const req = createMockRequest({ session: {} });
      const res = createMockResponse();
      const next = jest.fn();

      cartMiddleware(req, res, next);

      expect(res.locals.cart).toEqual({ items: [] });
      expect(next).toHaveBeenCalled();
    });

    /**
     * Test: existing cart items in session should be passed through to
     * `res.locals.cart` unchanged.
     */
    it('passes through existing cart items', () => {
      const req = createMockRequest({ session: { cart: { items: [{ productId: 1, quantity: 2 }] } } });
      const res = createMockResponse();
      const next = jest.fn();

      cartMiddleware(req, res, next);

      expect(res.locals.cart.items).toHaveLength(1);
    });
  });

  describe('review rate limit', () => {
    /**
     * Test: rate key should be built from user id when authenticated.
     */
    it('uses user id when authenticated', () => {
      const key = reviewRateLimit.keyGenerator({ session: { user: { id: 7 } }, ip: '127.0.0.1' });

      expect(key).toBe('user:7');
    });

    /**
     * Test: when not authenticated, the IP address should be used in the key.
     */
    it('uses ip when guest', () => {
      const key = reviewRateLimit.keyGenerator({ session: {}, ip: '127.0.0.1' });

      expect(key).toBe('ip:ip:127.0.0.1');
    });

    /**
     * Test: when handler is invoked due to rate limit breach it should
     * return a 429 response with localized message.
     */
    it('returns 429 response for too many comments', () => {
      const res = createMockResponse();

      reviewRateLimit.handler({}, res);

      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.send).toHaveBeenCalledWith('Слишком много комментариев');
    });
  });

  describe('rateLimits export', () => {
    /**
     * Test: rate limiter module should expose configured limiters for
     * login and registration endpoints.
     */
    it('exposes login and register limiters', () => {
      expect(rateLimits.loginLimiter).toBeDefined();
      expect(rateLimits.registerLimiter).toBeDefined();
    });
  });

  describe('uploadMiddleware', () => {
    /**
     * Test: upload middleware should configure file filters, limits and
     * expose `single`/`fields` handlers for routes.
     */
    it('configures upload handlers and validates file types', () => {
      expect(uploadMiddleware.uploadSingle).toBe('single-middleware');
      expect(uploadMiddleware.uploadImageAndImage2).toBe('fields-middleware');
      expect(capturedUploadOptions.limits.fileSize).toBe(20 * 1024 * 1024);

      const allowCb = jest.fn();
      capturedUploadOptions.fileFilter({}, { mimetype: 'image/png' }, allowCb);
      expect(allowCb).toHaveBeenCalledWith(null, true);

      const denyCb = jest.fn();
      capturedUploadOptions.fileFilter({}, { mimetype: 'application/pdf' }, denyCb);
      expect(denyCb).toHaveBeenCalledWith(expect.any(Error), false);
    });

    /**
     * Test: disk storage callbacks should generate destination directories
     * and normalized filenames for uploads.
     */
    it('creates destination and filenames for uploads', () => {
      const cb = jest.fn();
      capturedDiskStorageOptions.destination({}, {}, cb);
      expect(cb).toHaveBeenCalledWith(null, expect.stringContaining('public'));

      const filenameCb = jest.fn();
      capturedDiskStorageOptions.filename({}, { originalname: 'My Image 01.PNG' }, filenameCb);
      expect(filenameCb).toHaveBeenCalledWith(null, expect.stringMatching(/^my-ima-[a-f0-9]{4}\.PNG$/i));
    });

    /**
     * Test: upload error handler should map Multer errors to friendly JSON
     * responses and pass-through when no error is present.
     */
    it('handles multer errors and generic errors', () => {
      const res = createMockResponse();
      const next = jest.fn();
      const { MulterError } = require('multer');

      uploadMiddleware.handleUploadError(new MulterError('LIMIT_FILE_SIZE'), {}, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Файл слишком большой (макс 20MB)' });

      const res2 = createMockResponse();
      uploadMiddleware.handleUploadError(new Error('bad file'), {}, res2, next);
      expect(res2.status).toHaveBeenCalledWith(400);
      expect(res2.json).toHaveBeenCalledWith({ error: 'bad file' });

      const res3 = createMockResponse();
      uploadMiddleware.handleUploadError(null, {}, res3, next);
      expect(next).toHaveBeenCalled();
    });
  });
});