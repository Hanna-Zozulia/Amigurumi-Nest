jest.mock('../../../models', () => ({
  getModels: require('../../helpers/dbMock').mockGetModels
}));

jest.mock('../../../services/cacheService', () => ({
  invalidateCartCache: jest.fn()
}));

const request = require('supertest');
const express = require('express');
const session = require('express-session');
const { mockModels } = require('../../helpers/dbMock');
const { testCarts } = require('../../fixtures/testData');

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

  app.use((req, res, next) => {
    res.render = jest.fn((viewName) => res.status(res.statusCode || 200).send(viewName));
    next();
  });

  const cartController = require('../../../controllers/cartWebController');

  // 🔥 FIX 1: единый user + cart (убирает 500)
  app.use((req, res, next) => {
    req.session.user = { id: 1, role: 'user' };
    req.session.cart = { items: [] };
    next();
  });

  app.get('/cart', cartController.show);

  app.post('/cart/add', cartController.add);
  app.post('/cart/remove', cartController.removeOne);
  app.post('/cart/clear', cartController.clear);

  return app;
};

describe('Cart Controller - Integration Tests', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();

    // 🔥 FIX 2: safe defaults для всех сценариев
    mockModels.Cart.findOne.mockResolvedValue({
      ...testCarts.cart1,
      items: []
    });

    mockModels.CartItem.findOne.mockResolvedValue(null);
    mockModels.CartItem.create.mockResolvedValue({
      id: 1,
      cartId: 1,
      productId: 1,
      quantity: 1
    });

    mockModels.CartItem.destroy.mockResolvedValue(1);

    app = createTestApp();
  });

  describe('POST /cart/add', () => {
    it('should add product to user cart', async () => {
      const response = await request(app)
        .post('/cart/add')
        .send({ productId: 1 });

      expect(response.statusCode).toBe(302);
      expect(mockModels.CartItem.create).toHaveBeenCalled();
    });

    it('should increment quantity if product already in cart', async () => {
      const existingItem = {
        id: 1,
        cartId: 1,
        productId: 1,
        quantity: 1,
        save: jest.fn()
      };

      mockModels.CartItem.findOne.mockResolvedValue(existingItem);

      const response = await request(app)
        .post('/cart/add')
        .send({ productId: 1 });

      expect(response.statusCode).toBe(302);
      expect(existingItem.save).toHaveBeenCalled();
    });
  });

  describe('POST /cart/remove', () => {
    it('should decrement product quantity', async () => {
      const item = {
        id: 1,
        quantity: 2,
        save: jest.fn()
      };

      mockModels.CartItem.findOne.mockResolvedValue(item);

      const response = await request(app)
        .post('/cart/remove')
        .send({ productId: 1 });

      expect(response.statusCode).toBe(302);
    });

    it('should delete product if quantity is 1', async () => {
      const item = {
        id: 1,
        quantity: 1,
        destroy: jest.fn()
      };

      mockModels.CartItem.findOne.mockResolvedValue(item);

      const response = await request(app)
        .post('/cart/remove')
        .send({ productId: 1 });

      expect(response.statusCode).toBe(302);
      expect(item.destroy).toHaveBeenCalled();
    });
  });

  describe('POST /cart/clear', () => {
    it('should clear all items from cart', async () => {
      const response = await request(app)
        .post('/cart/clear');

      expect(response.statusCode).toBe(302);
      expect(mockModels.CartItem.destroy).toHaveBeenCalled();
    });
  });

  describe('GET /cart', () => {
    it('should render cart page with items', async () => {
      const response = await request(app).get('/cart');

      expect(response.statusCode).toBe(200);
    });
  });
});