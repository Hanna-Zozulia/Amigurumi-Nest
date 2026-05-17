// tests/integration/controllers/review.controller.test.js

jest.mock('../../../models', () => ({
  getModels: require('../../helpers/dbMock').mockGetModels
}));

jest.mock('../../../services/cacheService', () => ({
  invalidateReviewsCache: jest.fn().mockResolvedValue(undefined)
}));

jest.mock('../../../services/emailService', () => ({
  getMailTransporter: jest.fn(() => null)
}));

jest.mock('../../../services/profanityFilter', () => ({
  checkProfanity: jest.fn((text) => ({
    flagged: String(text).includes('badword'),
    reason: String(text).includes('badword') ? 'profanity' : null
  }))
}));

const request = require('supertest');
const express = require('express');
const session = require('express-session');
const { mockModels } = require('../../helpers/dbMock');
const { testReviews } = require('../../fixtures/testData');

const reviewController = require('../../../controllers/reviewController');

const createTestApp = ({
  defaultUser = { id: 1, role: 'user' },
  deleteUser = { id: 1, role: 'user' },
  replyUser = { id: 2, role: 'admin' }
} = {}) => {
  const app = express();

  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());

  app.use(session({
    secret: 'test-secret',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
  }));

  app.use((req, res, next) => {
    req.session.user = { ...defaultUser };
    res.render = jest.fn((viewName) => res.status(200).send(viewName));
    next();
  });

  app.post('/review/add', reviewController.addReview);
  app.get('/review/edit/:id', reviewController.editReviewForm);
  app.post('/review/edit/:id', reviewController.updateReview);
  app.post('/review/delete/:id', (req, res, next) => {
    req.session.user = { ...deleteUser };
    next();
  }, reviewController.deleteReview);
  app.post('/review/reply/:id', (req, res, next) => {
    req.session.user = { ...replyUser };
    next();
  }, reviewController.replyReview);
  app.post('/review/reply/delete/:id', (req, res, next) => {
    req.session.user = { ...replyUser };
    next();
  }, reviewController.deleteReply);

  return app;
};

describe('Review Controller - Integration Tests', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = createTestApp();

    mockModels.Review.create.mockResolvedValue({
      id: 1,
      text: 'test',
      userId: 1,
      productId: 1,
      status: 'approved',
      blockedReason: null,
      adminReply: null,
      update: jest.fn(),
      destroy: jest.fn()
    });
  });

  describe('POST /review/add', () => {
    it('should create review with clean text', async () => {
      const review = {
        ...testReviews.review1,
        id: 2
      };

      mockModels.Review.create.mockResolvedValue(review);

      const response = await request(app)
        .post('/review/add')
        .send({
          productId: 1,
          text: 'Great product!'
        });

      expect(response.statusCode).toBe(302);
      expect(mockModels.Review.create).toHaveBeenCalledWith(expect.objectContaining({
        text: 'great product!',
        productId: 1,
        userId: 1,
        status: 'approved',
        blockedReason: null
      }));
    });

    it('should block review with profanity', async () => {
      const blockedReview = {
        ...testReviews.review1,
        status: 'blocked',
        blockedReason: 'profanity'
      };

      mockModels.Review.create.mockResolvedValue(blockedReview);

      const response = await request(app)
        .post('/review/add')
        .send({
          productId: 1,
          text: 'This is badword'
        });

      expect(response.statusCode).toBe(302);
      expect(mockModels.Review.create).toHaveBeenCalledWith(expect.objectContaining({
        status: 'blocked',
        blockedReason: 'profanity'
      }));
    });
  });

  describe('GET /review/edit/:id', () => {
    it('should render edit form for owner', async () => {
      mockModels.Review.findByPk.mockResolvedValue({
        ...testReviews.review1,
        userId: 1
      });

      const response = await request(app)
        .get('/review/edit/1');

      expect(response.statusCode).toBe(200);
      expect(response.text).toBe('edit_review');
    });

    it('should return 403 for non-owner', async () => {
      mockModels.Review.findByPk.mockResolvedValue({
        ...testReviews.review1,
        userId: 999
      });

      const response = await request(app)
        .get('/review/edit/1');

      expect(response.statusCode).toBe(403);
    });

    it('should return 404 for missing review', async () => {
      mockModels.Review.findByPk.mockResolvedValue(null);

      const response = await request(app)
        .get('/review/edit/999');

      expect(response.statusCode).toBe(404);
    });
  });

  describe('POST /review/edit/:id', () => {
    it('should update review by owner', async () => {
      const review = {
        ...testReviews.review1,
        userId: 1,
        update: jest.fn().mockResolvedValue(testReviews.review1)
      };

      mockModels.Review.findByPk.mockResolvedValue(review);

      const response = await request(app)
        .post('/review/edit/1')
        .send({ text: 'Updated text' });

      expect(response.statusCode).toBe(302);
      expect(review.update).toHaveBeenCalledWith(expect.objectContaining({
        text: 'updated text',
        status: 'approved',
        blockedReason: null
      }));
    });

    it('should prevent non-owner from editing review', async () => {
      mockModels.Review.findByPk.mockResolvedValue({
        ...testReviews.review1,
        userId: 999
      });

      const response = await request(app)
        .post('/review/edit/1')
        .send({ text: 'Updated text' });

      expect(response.statusCode).toBe(403);
    });

    it('should return 404 for missing review', async () => {
      mockModels.Review.findByPk.mockResolvedValue(null);

      const response = await request(app)
        .post('/review/edit/999')
        .send({ text: 'Updated text' });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('POST /review/delete/:id', () => {
    it('should allow owner to delete review', async () => {
      const review = {
        ...testReviews.review1,
        userId: 1,
        destroy: jest.fn().mockResolvedValue(1)
      };

      mockModels.Review.findByPk.mockResolvedValue(review);

      const response = await request(app)
        .post('/review/delete/1')
        .send({});

      expect(response.statusCode).toBe(302);
      expect(review.destroy).toHaveBeenCalled();
    });

    it('should prevent deletion if admin replied', async () => {
      mockModels.Review.findByPk.mockResolvedValue({
        ...testReviews.review1,
        adminReply: 'Thanks!'
      });

      const response = await request(app)
        .post('/review/delete/1')
        .send({});

      expect(response.statusCode).toBe(403);
    });

    it('should return 404 for missing review', async () => {
      mockModels.Review.findByPk.mockResolvedValue(null);

      const response = await request(app)
        .post('/review/delete/999')
        .send({});

      expect(response.statusCode).toBe(404);
    });
  });

  describe('POST /review/delete/:id as admin', () => {
    it('should allow admin to delete any review', async () => {
      const adminApp = createTestApp({
        deleteUser: { id: 2, role: 'admin' }
      });

      const review = {
        ...testReviews.review1,
        userId: 999,
        destroy: jest.fn().mockResolvedValue(1)
      };

      mockModels.Review.findByPk.mockResolvedValue(review);

      const response = await request(adminApp)
        .post('/review/delete/1')
        .send({});

      expect(response.statusCode).toBe(302);
      expect(review.destroy).toHaveBeenCalled();
    });
  });

  describe('POST /review/reply/:id', () => {
    it('should add admin reply to review', async () => {
      const review = {
        ...testReviews.review1,
        update: jest.fn().mockResolvedValue(testReviews.review1)
      };

      mockModels.Review.findByPk.mockResolvedValue(review);

      const response = await request(app)
        .post('/review/reply/1')
        .send({
          adminReply: 'Thank you!'
        });

      expect(response.statusCode).toBe(302);
      expect(review.update).toHaveBeenCalledWith({ adminReply: 'thank you!' });
    });

    it('should prevent non-admin from replying', async () => {
      const userApp = createTestApp({
        replyUser: { id: 1, role: 'user' }
      });

      mockModels.Review.findByPk.mockResolvedValue({
        ...testReviews.review1,
        update: jest.fn()
      });

      const response = await request(userApp)
        .post('/review/reply/1')
        .send({
          adminReply: 'Thank you!'
        });

      expect(response.statusCode).toBe(403);
    });

    it('should return 404 for missing review', async () => {
      mockModels.Review.findByPk.mockResolvedValue(null);

      const response = await request(app)
        .post('/review/reply/999')
        .send({
          adminReply: 'Thank you!'
        });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('Additional Coverage - Review Profanity & Admin Operations', () => {
    it('should handle review creation with profanity block', async () => {
      mockModels.Review.create.mockResolvedValue({
        id: 1,
        status: 'blocked'
      });

      const app = createTestApp();

      const response = await request(app)
        .post('/review/add')
        .send({
          productId: 1,
          text: 'this product is badword'
        });

      expect(response.statusCode).toBe(302);
      expect(response.headers.location).toContain('reviewError=blocked');
    });

    it('should handle review update with profanity', async () => {
      const review = {
        id: 1,
        userId: 1,
        productId: 1,
        update: jest.fn().mockResolvedValue(true)
      };

      mockModels.Review.findByPk.mockResolvedValue(review);

      const app = createTestApp();

      const response = await request(app)
        .post('/review/edit/1')
        .send({
          text: 'this contains badword'
        });

      expect(response.statusCode).toBe(302);
      expect(response.headers.location).toContain('reviewError=blocked');
    });

    it('should allow admin to delete any review', async () => {
      const review = {
        id: 1,
        userId: 999,
        productId: 1,
        adminReply: null,
        destroy: jest.fn().mockResolvedValue(true)
      };

      mockModels.Review.findByPk.mockResolvedValue(review);

      const app = createTestApp({ deleteUser: { id: 2, role: 'admin' } });

      const response = await request(app)
        .post('/review/delete/1');

      expect(response.statusCode).toBe(302);
      expect(review.destroy).toHaveBeenCalled();
    });

    it('should prevent deletion of review with admin reply', async () => {
      mockModels.Review.findByPk.mockResolvedValue({
        id: 1,
        userId: 1,
        productId: 1,
        adminReply: 'Admin has replied'
      });

      const app = createTestApp();

      const response = await request(app)
        .post('/review/delete/1');

      expect(response.statusCode).toBe(403);
    });

    it('should handle admin reply with profanity block', async () => {
      mockModels.Review.findByPk.mockResolvedValue({
        id: 1,
        userId: 1,
        productId: 1
      });

      const app = createTestApp({ replyUser: { id: 2, role: 'admin' } });

      const response = await request(app)
        .post('/review/reply/1')
        .send({
          adminReply: 'This reply has badword in it'
        });

      expect(response.statusCode).toBe(302);
      expect(response.headers.location).toContain('reviewError=blocked');
    });

    it('should allow admin to add clean reply', async () => {
      const review = {
        id: 1,
        userId: 1,
        productId: 1,
        update: jest.fn().mockResolvedValue(true)
      };

      mockModels.Review.findByPk.mockResolvedValue(review);

      const app = createTestApp({ replyUser: { id: 2, role: 'admin' } });

      const response = await request(app)
        .post('/review/reply/1')
        .send({
          adminReply: 'Thank you for your feedback!'
        });

      expect(response.statusCode).toBe(302);
      expect(review.update).toHaveBeenCalled();
    });

    it('should prevent non-admin from replying', async () => {
      mockModels.Review.findByPk.mockResolvedValue({
        id: 1,
        userId: 1,
        productId: 1
      });

      const app = createTestApp({ replyUser: { id: 1, role: 'user' } });

      const response = await request(app)
        .post('/review/reply/1')
        .send({
          adminReply: 'User reply attempt'
        });

      expect(response.statusCode).toBe(403);
    });

    it('should allow admin to delete reply', async () => {
      const review = {
        id: 1,
        productId: 1,
        adminReply: 'Admin reply',
        update: jest.fn().mockResolvedValue(true)
      };

      mockModels.Review.findByPk.mockResolvedValue(review);

      const app = createTestApp({ replyUser: { id: 2, role: 'admin' } });

      const response = await request(app)
        .post('/review/reply/delete/1');

      expect(response.statusCode).toBe(302);
      expect(review.update).toHaveBeenCalled();
    });

    it('should prevent non-admin from deleting reply', async () => {
      mockModels.Review.findByPk.mockResolvedValue({
        id: 1,
        productId: 1,
        adminReply: 'Admin reply'
      });

      const app = createTestApp({ replyUser: { id: 1, role: 'user' } });

      const response = await request(app)
        .post('/review/reply/delete/1');

      expect(response.statusCode).toBe(403);
    });
  });
});