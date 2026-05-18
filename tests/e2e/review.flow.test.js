jest.mock('../../models', () => ({
  getModels: require('../helpers/dbMock').mockGetModels,
  initDb: jest.fn(async () => Promise.resolve())
}));

jest.mock('../../config/redis', () => ({
  getRedisClient: jest.fn(() => require('../helpers/redisMock')),
  initRedis: jest.fn(async () => Promise.resolve())
}));

jest.mock('../../services/profanityFilter', () => ({
  checkProfanity: jest.fn((text) => ({
    flagged: text.includes('badword'),
    reason: text.includes('badword') ? 'profanity' : null
  }))
}));

jest.mock('../../services/cacheService', () => ({
  invalidateReviewsCache: jest.fn()
}));

jest.mock('../../services/emailService', () => ({
  getMailTransporter: jest.fn(() => null)
}));

const request = require('supertest');
const express = require('express');
const session = require('express-session');
const { getModels } = require('../../models');
const { mockModels } = require('../helpers/dbMock');

/**
 * Create an express app instance configured for review E2E tests. Routes use
 * the real review controller while authentication is simulated by small
 * middleware that injects `req.session.user` to emulate different user roles.
 */
const createApp = () => {
  const app = express();
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());
  app.use(session({
    secret: 'test-secret',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
  }));

  app.set('view engine', 'ejs');

  const reviewController = require('../../controllers/reviewController');

  // Middleware: simulate an authenticated user for adding reviews
  app.post('/review/add', (req, res, next) => {
    req.session.user = { id: 1 };
    next();
  }, reviewController.addReview);

  app.post('/review/edit/:id', (req, res, next) => {
    req.session.user = { id: 1 };
    next();
  }, reviewController.updateReview);

  app.post('/review/delete/:id', (req, res, next) => {
    req.session.user = { id: 1 };
    next();
  }, reviewController.deleteReview);

  // Middleware: simulate an admin user for replying to reviews
  app.post('/review/reply/:id', (req, res, next) => {
    req.session.user = { id: 2, role: 'admin' };
    next();
  }, reviewController.replyReview);

  return app;
};

describe('Review System - E2E Tests', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = createApp();
  });

  describe('Review Lifecycle', () => {
    it('should create, edit, and delete review', async () => {
      const review = {
        id: 1,
        productId: 1,
        userId: 1,
        text: 'Great product!',
        status: 'approved',
        blockedReason: null,
        adminReply: null,
        update: jest.fn().mockResolvedValue({}),
        destroy: jest.fn().mockResolvedValue({})
      };

      // Step 1: Create review
      mockModels.Review.create.mockResolvedValueOnce(review);
      mockModels.Review.findByPk.mockResolvedValueOnce(review);

      const createRes = await request(app)
        .post('/review/add')
        .send({
          productId: 1,
          text: 'Great product!'
        });

      expect(createRes.statusCode).toBe(302);
      expect(mockModels.Review.create).toHaveBeenCalled();

      // Step 2: Edit review
      mockModels.Review.findByPk.mockResolvedValueOnce(review);

      const editRes = await request(app)
        .post('/review/edit/1')
        .send({
          text: 'Updated review text'
        });

      expect(editRes.statusCode).toBe(302);
      expect(review.update).toHaveBeenCalled();

      // Step 3: Delete review
      mockModels.Review.findByPk.mockResolvedValueOnce(review);

      const deleteRes = await request(app)
        .post('/review/delete/1');

      expect(deleteRes.statusCode).toBe(302);
      expect(review.destroy).toHaveBeenCalled();
    });
  });

  describe('Profanity Filtering', () => {
    it('should block review with bad words', async () => {
      const blockedReview = {
        id: 1,
        productId: 1,
        userId: 1,
        text: 'This is badword',
        status: 'blocked',
        blockedReason: 'profanity'
      };

      mockModels.Review.create.mockResolvedValue(blockedReview);

      const res = await request(app)
        .post('/review/add')
        .send({
          productId: 1,
          text: 'This is badword'
        });

      expect(res.statusCode).toBe(302);
      expect(mockModels.Review.create).toHaveBeenCalled();
    });

    it('should approve review with clean text', async () => {
      const approvedReview = {
        id: 1,
        productId: 1,
        userId: 1,
        text: 'Excellent product!',
        status: 'approved',
        blockedReason: null
      };

      mockModels.Review.create.mockResolvedValue(approvedReview);

      const res = await request(app)
        .post('/review/add')
        .send({
          productId: 1,
          text: 'Excellent product!'
        });

      expect(res.statusCode).toBe(302);
    });
  });

  describe('Admin Reply System', () => {
    it('should allow admin to reply to review', async () => {
      const review = {
        id: 1,
        productId: 1,
        userId: 1,
        text: 'Nice product',
        adminReply: null,
        update: jest.fn().mockResolvedValue({ adminReply: 'Thanks for feedback!' })
      };

      mockModels.Review.findByPk.mockResolvedValue(review);

      const res = await request(app)
        .post('/review/reply/1')
        .send({
          adminReply: 'Thanks for feedback!'
        });

      expect(res.statusCode).toBe(302);
      expect(mockModels.Review.findByPk).toHaveBeenCalledWith('1');
    });

    it('should prevent owner from deleting review with admin reply', async () => {
      const review = {
        id: 1,
        productId: 1,
        userId: 1,
        adminReply: 'Thank you!'
      };

      mockModels.Review.findByPk.mockResolvedValue(review);

      const res = await request(app)
        .post('/review/delete/1');

      expect(res.statusCode).toBe(403);
      expect(res.text).toContain('Нельзя удалить');
    });
  });

  describe('Permission Control', () => {
    it('should only allow owner to edit their review', async () => {
      const review = {
        id: 1,
        userId: 999  // Different user
      };

      mockModels.Review.findByPk.mockResolvedValue(review);

      const res = await request(app)
        .post('/review/edit/1')
        .send({ text: 'Updated text' });

      expect(res.statusCode).toBe(403);
    });

    it('should allow admin to delete any review', async () => {
      const review = {
        id: 1,
        userId: 999,  // Different user
        destroy: jest.fn()
      };

      mockModels.Review.findByPk.mockResolvedValue(review);

      const adminApp = express();
      adminApp.use(express.urlencoded({ extended: true }));
      adminApp.use(express.json());
      adminApp.use(session({
        secret: 'test-secret',
        resave: false,
        saveUninitialized: true,
        cookie: { secure: false }
      }));

      const reviewController = require('../../controllers/reviewController');

      adminApp.post('/review/delete/:id', (req, res, next) => {
        req.session.user = { id: 2, role: 'admin' };
        next();
      }, reviewController.deleteReview);

      const res = await request(adminApp)
        .post('/review/delete/1');

      expect(res.statusCode).toBe(302);
      expect(review.destroy).toHaveBeenCalled();
    });
  });

  describe('Cache Invalidation', () => {
    it('should invalidate cache on review creation', async () => {
      const { invalidateReviewsCache } = require('../../services/cacheService');

      mockModels.Review.create.mockResolvedValue({
        id: 1,
        productId: 1,
        text: 'Test'
      });

      await request(app)
        .post('/review/add')
        .send({
          productId: 1,
          text: 'Test'
        });

      // Cache invalidation should be called
      expect(invalidateReviewsCache).toHaveBeenCalledWith(1);
    });
  });
});
