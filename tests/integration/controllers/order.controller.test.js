// tests/integration/controllers/order.controller.test.js

jest.mock('../../../models', () => ({
  getModels: require('../../helpers/dbMock').mockGetModels
}));

jest.mock('../../../services/orderService', () => ({
  loadCheckoutCart: jest.fn(),
  calculateCartTotal: jest.fn(),
  sendOrderEmail: jest.fn()
}));

const request = require('supertest');
const express = require('express');
const session = require('express-session');
const { getModels } = require('../../../models');
const { mockModels } = require('../../helpers/dbMock');
const orderService = require('../../../services/orderService');
const { testOrders, testProducts } = require('../../fixtures/testData');

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

  const orderController = require('../../../controllers/orderController');

  app.get('/checkout', orderController.checkoutPage);
  app.post('/order', (req, res, next) => {
    req.session.user = { id: 1 };
    next();
  }, orderController.createOrder);

  return app;
};

describe('Order Controller - Integration Tests', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = createTestApp();
  });

  describe('GET /checkout', () => {
    it('should render checkout page with cart', async () => {
      const mockCart = {
        items: [
          {
            productId: 1,
            quantity: 2,
            Product: testProducts.product1
          }
        ]
      };

      orderService.loadCheckoutCart.mockResolvedValue(mockCart);
      orderService.calculateCartTotal.mockReturnValue(51.98);

      const response = await request(app)
        .get('/checkout');

      expect(response.statusCode).toBe(200);
    });

    it('should handle empty cart', async () => {
      orderService.loadCheckoutCart.mockResolvedValue({ items: [] });
      orderService.calculateCartTotal.mockReturnValue(0);

      const response = await request(app)
        .get('/checkout');

      expect(response.statusCode).toBe(200);
    });
  });

  describe('POST /order', () => {
    it('should create order with valid data', async () => {
      const mockCart = {
        id: 1,
        items: [
          {
            productId: 1,
            quantity: 2,
            Product: testProducts.product1
          }
        ]
      };

      const newOrder = {
        ...testOrders.order1,
        id: 2
      };

      mockModels.Cart.findOne.mockResolvedValue(mockCart);
      mockModels.Order.create.mockResolvedValue(newOrder);
      mockModels.OrderItem.bulkCreate.mockResolvedValue([]);
      orderService.sendOrderEmail.mockResolvedValue(true);

      const response = await request(app)
        .post('/order')
        .send({
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+380123456789',
          address: 'Kyiv, Ukraine',
          notes: 'Gift wrap'
        });

      expect(response.statusCode).toBe(302);
      expect(mockModels.Order.create).toHaveBeenCalled();
    });

    it('should return 400 with empty cart', async () => {
      const mockCart = { items: [] };

      mockModels.Cart.findOne.mockResolvedValue(mockCart);

      const response = await request(app)
        .post('/order')
        .send({
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+380123456789',
          address: 'Kyiv, Ukraine'
        });

      expect(response.statusCode).toBe(400);
      expect(mockModels.Order.create).not.toHaveBeenCalled();
    });

    it('should validate required fields', async () => {
      const mockCart = {
        items: [
          {
            productId: 1,
            quantity: 1,
            Product: testProducts.product1
          }
        ]
      };

      mockModels.Cart.findOne.mockResolvedValue(mockCart);

      const response = await request(app)
        .post('/order')
        .send({
          name: '',  // missing name
          email: 'john@example.com',
          phone: '+380123456789',
          address: 'Kyiv, Ukraine'
        });

      expect(response.statusCode).toBe(302);
      expect(mockModels.Order.create).not.toHaveBeenCalled();
    });

    it('should send order email asynchronously', async () => {
      const mockCart = {
        id: 1,
        items: [
          {
            productId: 1,
            quantity: 1,
            Product: testProducts.product1
          }
        ]
      };

      const newOrder = testOrders.order1;

      mockModels.Cart.findOne.mockResolvedValue(mockCart);
      mockModels.Order.create.mockResolvedValue(newOrder);
      mockModels.OrderItem.bulkCreate.mockResolvedValue([]);
      orderService.sendOrderEmail.mockResolvedValue(true);

      const response = await request(app)
        .post('/order')
        .send({
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+380123456789',
          address: 'Kyiv, Ukraine'
        });

      expect(response.statusCode).toBe(302);
    });
  });

  describe('Additional Coverage - Order Error Paths', () => {
    it('should handle missing cart', async () => {
      mockModels.Cart.findOne.mockResolvedValue(null);

      const response = await request(app)
        .post('/order')
        .send({
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+380123456789',
          address: 'Kyiv, Ukraine'
        });

      expect(response.statusCode).toBe(400);
    });

    it('should handle empty cart', async () => {
      mockModels.Cart.findOne.mockResolvedValue({
        items: []
      });

      const response = await request(app)
        .post('/order')
        .send({
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+380123456789',
          address: 'Kyiv, Ukraine'
        });

      expect(response.statusCode).toBe(400);
    });

    it('should handle database error on order creation', async () => {
      const mockCart = {
        items: [
          {
            productId: 1,
            quantity: 1,
            Product: testProducts.product1
          }
        ]
      };

      mockModels.Cart.findOne.mockResolvedValue(mockCart);
      mockModels.Order.create.mockRejectedValue(new Error('DB Error'));

      const response = await request(app)
        .post('/order')
        .send({
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+380123456789',
          address: 'Kyiv, Ukraine'
        });

      expect(response.statusCode).toBe(500);
    });

    it('should handle missing required email field', async () => {
      const mockCart = {
        items: [
          {
            productId: 1,
            quantity: 1,
            Product: testProducts.product1
          }
        ]
      };

      mockModels.Cart.findOne.mockResolvedValue(mockCart);
      mockModels.Order.create.mockResolvedValue({ id: 101 });
      mockModels.OrderItem.bulkCreate.mockResolvedValue([]);
      orderService.sendOrderEmail.mockResolvedValue(true);

      const response = await request(app)
        .post('/order')
        .send({
          name: 'John Doe',
          email: '', // empty email
          phone: '+380123456789',
          address: 'Kyiv, Ukraine'
        });

      expect(response.statusCode).toBe(302);
    });

    it('should handle missing required phone field', async () => {
      const mockCart = {
        items: [
          {
            productId: 1,
            quantity: 1,
            Product: testProducts.product1
          }
        ]
      };

      mockModels.Cart.findOne.mockResolvedValue(mockCart);

      const response = await request(app)
        .post('/order')
        .send({
          name: 'John Doe',
          email: 'john@example.com',
          phone: '', // empty phone
          address: 'Kyiv, Ukraine'
        });

      expect(response.statusCode).toBe(302);
    });

    it('should handle missing required address field', async () => {
      const mockCart = {
        items: [
          {
            productId: 1,
            quantity: 1,
            Product: testProducts.product1
          }
        ]
      };

      mockModels.Cart.findOne.mockResolvedValue(mockCart);

      const response = await request(app)
        .post('/order')
        .send({
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+380123456789',
          address: '' // empty address
        });

      expect(response.statusCode).toBe(302);
    });

    it('should handle email service error gracefully', async () => {
      const mockCart = {
        items: [
          {
            productId: 1,
            quantity: 1,
            Product: testProducts.product1
          }
        ]
      };

      const newOrder = {
        id: 100,
        userId: 1,
        total: 150,
        destroy: jest.fn().mockResolvedValue(true)
      };

      mockModels.Cart.findOne.mockResolvedValue(mockCart);
      mockModels.Order.create.mockResolvedValue(newOrder);
      mockModels.OrderItem.bulkCreate.mockResolvedValue([]);
      orderService.sendOrderEmail.mockRejectedValue(new Error('Email service down'));

      const response = await request(app)
        .post('/order')
        .send({
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+380123456789',
          address: 'Kyiv, Ukraine'
        });

      expect(response.statusCode).toBe(302);
      await new Promise((resolve) => setImmediate(resolve));
      expect(orderService.sendOrderEmail).toHaveBeenCalled();
    });
  });
});
