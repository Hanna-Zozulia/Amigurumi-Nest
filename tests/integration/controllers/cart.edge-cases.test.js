// tests/integration/controllers/cart.edge-cases.test.js
// Branch coverage tests for cart API controller error/edge cases

jest.mock('../../../models', () => ({
  getModels: require('../../helpers/dbMock').mockGetModels
}));

jest.mock('../../../services/cacheService', () => ({
  invalidateCartCache: jest.fn()
}));

const request = require('supertest');
const express = require('express');
const session = require('express-session');
const path = require('path');

const { mockModels } = require('../../helpers/dbMock');
const { testUsers } = require('../../fixtures/testData');
const { invalidateCartCache } = require('../../../services/cacheService');

const createTestApp = () => {
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
  app.set('views', path.join(__dirname, '../../../views'));

  const cartController = require('../../../controllers/cartApiController');

  app.get('/api/cart', (req, res, next) => {
    req.session.user = testUsers.regularUser;
    cartController.getCart(req, res, next);
  });

  app.post('/api/cart/add', (req, res, next) => {
    req.session.user = testUsers.regularUser;
    cartController.add(req, res, next);
  });

  app.post('/api/cart/remove', (req, res, next) => {
    req.session.user = testUsers.regularUser;
    cartController.removeOne(req, res, next);
  });

  app.post('/api/cart/clear', (req, res, next) => {
    req.session.user = testUsers.regularUser;
    cartController.clear(req, res, next);
  });

  return app;
};

describe('Cart API Controller - Edge Cases & Error Paths', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = createTestApp();
  });

  describe('GET /api/cart - Retrieval branches', () => {
    it('should return 401 when user not logged in', async () => {
      const app = express();
      app.use(session({
        secret: 'test-secret',
        resave: false,
        saveUninitialized: true,
        cookie: { secure: false }
      }));
      app.get('/api/cart', require('../../../controllers/cartApiController').getCart);

      const response = await request(app).get('/api/cart');

      expect(response.statusCode).toBe(401);
      expect(response.body.error).toBe('Not logged in');
    });

    it('should return empty cart when user has no cart', async () => {
      mockModels.Cart.findOne.mockResolvedValue(null);

      const response = await request(app).get('/api/cart');

      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual({ items: [] });
    });

    it('should return cart with items when cart exists', async () => {
      mockModels.Cart.findOne.mockResolvedValue({
        id: 1,
        userId: testUsers.regularUser.id,
        items: [
          { id: 1, productId: 1, quantity: 2 }
        ]
      });

      const response = await request(app).get('/api/cart');

      expect(response.statusCode).toBe(200);
      expect(response.body.items).toHaveLength(1);
    });

    it('should handle database error on getCart', async () => {
      mockModels.Cart.findOne.mockRejectedValue(new Error('DB error'));

      const response = await request(app).get('/api/cart');

      expect(response.statusCode).toBe(500);
      expect(response.body.error).toBe('Internal server error');
    });
  });

  describe('POST /api/cart/add - Cart creation & item handling', () => {
    it('should create new cart when user has none', async () => {
      const newCart = { id: 1, userId: testUsers.regularUser.id };
      mockModels.Cart.findOne.mockResolvedValueOnce(null); // No cart exists
      mockModels.Cart.create.mockResolvedValue(newCart);
      mockModels.CartItem.findOne.mockResolvedValue(null); // Item doesn't exist
      mockModels.CartItem.create.mockResolvedValue({
        id: 1,
        cartId: 1,
        productId: 10,
        quantity: 1
      });

      const response = await request(app)
        .post('/api/cart/add')
        .send({ productId: 10 });

      expect(response.statusCode).toBe(200);
      expect(mockModels.Cart.create).toHaveBeenCalledWith({
        userId: testUsers.regularUser.id
      });
      expect(invalidateCartCache).toHaveBeenCalledWith(testUsers.regularUser.id);
    });

    it('should increment quantity when item already in cart', async () => {
      const existingItem = {
        id: 5,
        cartId: 1,
        productId: 10,
        quantity: 2,
        save: jest.fn().mockResolvedValue(true)
      };

      mockModels.Cart.findOne.mockResolvedValue({ id: 1 });
      mockModels.CartItem.findOne.mockResolvedValue(existingItem);

      const response = await request(app)
        .post('/api/cart/add')
        .send({ productId: 10 });

      expect(response.statusCode).toBe(200);
      expect(existingItem.quantity).toBe(3);
      expect(existingItem.save).toHaveBeenCalled();
    });

    it('should handle 401 when not logged in', async () => {
      const app = express();
      app.use(session({
        secret: 'test-secret',
        resave: false,
        saveUninitialized: true,
        cookie: { secure: false }
      }));
      app.post('/api/cart/add', require('../../../controllers/cartApiController').add);

      const response = await request(app)
        .post('/api/cart/add')
        .send({ productId: 10 });

      expect(response.statusCode).toBe(401);
    });

    it('should handle database error on add', async () => {
      mockModels.Cart.findOne.mockRejectedValue(new Error('DB error'));

      const response = await request(app)
        .post('/api/cart/add')
        .send({ productId: 10 });

      expect(response.statusCode).toBe(500);
    });
  });

  describe('POST /api/cart/remove - Quantity reduction branches', () => {
    it('should decrement quantity when item count > 1', async () => {
      const item = {
        id: 5,
        quantity: 3,
        save: jest.fn().mockResolvedValue(true)
      };

      mockModels.Cart.findOne.mockResolvedValue({ id: 1 });
      mockModels.CartItem.findOne.mockResolvedValue(item);

      const response = await request(app)
        .post('/api/cart/remove')
        .send({ productId: 5 });

      expect(response.statusCode).toBe(200);
      expect(item.quantity).toBe(2);
      expect(item.save).toHaveBeenCalled();
    });

    it('should remove item entirely when quantity = 1', async () => {
      const item = {
        id: 5,
        quantity: 1,
        destroy: jest.fn().mockResolvedValue(true)
      };

      mockModels.Cart.findOne.mockResolvedValue({ id: 1 });
      mockModels.CartItem.findOne.mockResolvedValue(item);

      const response = await request(app)
        .post('/api/cart/remove')
        .send({ productId: 5 });

      expect(response.statusCode).toBe(200);
      expect(item.destroy).toHaveBeenCalled();
    });

    it('should handle 401 when not logged in', async () => {
      const app = express();
      app.use(session({
        secret: 'test-secret',
        resave: false,
        saveUninitialized: true,
        cookie: { secure: false }
      }));
      app.post('/api/cart/remove', require('../../../controllers/cartApiController').removeOne);

      const response = await request(app)
        .post('/api/cart/remove')
        .send({ productId: 5 });

      expect(response.statusCode).toBe(401);
    });

    it('should return empty object when item not found', async () => {
      mockModels.Cart.findOne.mockResolvedValue({ id: 1 });
      mockModels.CartItem.findOne.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/cart/remove')
        .send({ productId: 999 });

      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual({});
    });

    it('should return empty object when cart not found', async () => {
      mockModels.Cart.findOne.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/cart/remove')
        .send({ productId: 5 });

      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual({});
    });

    it('should handle database error on remove', async () => {
      mockModels.Cart.findOne.mockRejectedValue(new Error('DB error'));

      const response = await request(app)
        .post('/api/cart/remove')
        .send({ productId: 5 });

      expect(response.statusCode).toBe(500);
    });
  });

  describe('POST /api/cart/clear - Clear all items', () => {
    it('should clear all cart items for user', async () => {
      mockModels.Cart.findOne.mockResolvedValue({ id: 1 });
      mockModels.CartItem.destroy.mockResolvedValue(2); // 2 items deleted

      const response = await request(app).post('/api/cart/clear');

      expect(response.statusCode).toBe(200);
      expect(mockModels.CartItem.destroy).toHaveBeenCalledWith({
        where: { cartId: 1 }
      });
      expect(invalidateCartCache).toHaveBeenCalled();
    });

    it('should handle 401 when not logged in', async () => {
      const app = express();
      app.use(session({
        secret: 'test-secret',
        resave: false,
        saveUninitialized: true,
        cookie: { secure: false }
      }));
      app.post('/api/cart/clear', require('../../../controllers/cartApiController').clear);

      const response = await request(app).post('/api/cart/clear');

      expect(response.statusCode).toBe(401);
    });

    it('should handle database error on clear', async () => {
      mockModels.Cart.findOne.mockRejectedValue(new Error('DB error'));

      const response = await request(app).post('/api/cart/clear');

      expect(response.statusCode).toBe(500);
    });

    it('should succeed when cart does not exist', async () => {
      mockModels.Cart.findOne.mockResolvedValue(null);

      const response = await request(app).post('/api/cart/clear');

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});
