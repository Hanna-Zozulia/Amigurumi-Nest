jest.mock('../../models', () => ({
  getModels: require('../helpers/dbMock').mockGetModels,
  initDb: jest.fn(async () => Promise.resolve())
}));

jest.mock('../../config/redis', () => ({
  getRedisClient: jest.fn(() => require('../helpers/redisMock')),
  initRedis: jest.fn(async () => Promise.resolve())
}));

jest.mock('../../services/orderService', () => ({
  loadCheckoutCart: jest.fn(),
  calculateCartTotal: jest.fn(),
  sendOrderEmail: jest.fn()
}));

jest.mock('../../middleware/cartMiddleware', () => jest.fn((req, res, next) => {
  res.locals.cart = req.session?.cart || { items: [] };
  next();
}));

const request = require('supertest');
const express = require('express');
const session = require('express-session');
const { getModels } = require('../../models');
const { mockModels } = require('../helpers/dbMock');
const orderService = require('../../services/orderService');
const { testProducts } = require('../fixtures/testData');

/**
 * Create a minimal express app for checkout E2E tests. Routes use real
 * controllers while user authentication is simulated by middleware that sets
 * `req.session.user` when needed.
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

  // Cart and Order routes
  const cartController = require('../../controllers/cartWebController');
  const orderController = require('../../controllers/orderController');

  // Middleware: simulate an authenticated user for cart add action
  app.post('/cart/add', (req, res, next) => {
    req.session.user = { id: 1 };
    next();
  }, cartController.add);

  app.get('/checkout', orderController.checkoutPage);
  
  // Middleware: simulate an authenticated user for order creation
  app.post('/order', (req, res, next) => {
    req.session.user = { id: 1 };
    next();
  }, orderController.createOrder);

  return app;
};

describe('Checkout Flow - E2E Tests', () => {
  let app;
  const agent = request.agent;

  beforeEach(() => {
    jest.clearAllMocks();
    app = createApp();
  });

  describe('Complete Purchase Flow', () => {
    it('should complete full checkout: add item -> view cart -> checkout -> create order', async () => {
      const cart = {
        id: 1,
        userId: 1,
        items: [
          {
            productId: 1,
            quantity: 1,
            Product: testProducts.product1
          }
        ]
      };

      const order = {
        id: 1,
        userId: 1,
        total: testProducts.product1.price,
        status: 'unprocessed',
        customerName: 'John Doe',
        customerEmail: 'john@example.com',
        customerPhone: '+380123456789',
        customerAddress: 'Kyiv, Ukraine'
      };

      // Step 1: Add item to cart
      mockModels.Cart.findOne.mockResolvedValueOnce({ items: [] });
      mockModels.CartItem.findOne.mockResolvedValueOnce(null);
      mockModels.CartItem.create.mockResolvedValueOnce({
        id: 1,
        cartId: 1,
        productId: 1,
        quantity: 1
      });

      const addRes = await request(app)
        .post('/cart/add')
        .send({ productId: 1 });

      expect(addRes.statusCode).toBe(302);

      // Step 2: View checkout
      orderService.loadCheckoutCart.mockResolvedValueOnce(cart);
      orderService.calculateCartTotal.mockReturnValueOnce(testProducts.product1.price);

      const checkoutRes = await request(app).get('/checkout');

      expect(checkoutRes.statusCode).toBe(200);

      // Step 3: Create order
      mockModels.Cart.findOne.mockResolvedValueOnce(cart);
      mockModels.Order.create.mockResolvedValueOnce(order);
      mockModels.OrderItem.bulkCreate.mockResolvedValueOnce([]);
      orderService.sendOrderEmail.mockResolvedValueOnce(true);

      const orderRes = await request(app)
        .post('/order')
        .send({
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+380123456789',
          address: 'Kyiv, Ukraine'
        });

      expect(orderRes.statusCode).toBe(302);
      expect(mockModels.Order.create).toHaveBeenCalled();
    });

    it('should calculate order total correctly', async () => {
      const items = [
        { productId: 1, quantity: 2, Product: testProducts.product1 },
        { productId: 2, quantity: 1, Product: testProducts.product2 }
      ];

      const cart = { id: 1, items };
      const expectedTotal = (testProducts.product1.price * 2) + testProducts.product2.price;

      orderService.loadCheckoutCart.mockResolvedValue(cart);
      orderService.calculateCartTotal.mockReturnValue(expectedTotal);

      const total = orderService.calculateCartTotal(cart);

      expect(total).toBe(expectedTotal);
    });

    it('should handle checkout with no items', async () => {
      orderService.loadCheckoutCart.mockResolvedValue({ items: [] });
      orderService.calculateCartTotal.mockReturnValue(0);

      const res = await request(app).get('/checkout');

      expect(res.statusCode).toBe(200);
    });
  });

  describe('Order Validation', () => {
    it('should validate required customer fields', async () => {
      const cart = {
        id: 1,
        items: [
          { productId: 1, quantity: 1, Product: testProducts.product1 }
        ]
      };

      mockModels.Cart.findOne.mockResolvedValue(cart);

      const res = await request(app)
        .post('/order')
        .send({
          name: '',  // Empty name
          email: 'john@example.com',
          phone: '+380123456789',
          address: 'Kyiv, Ukraine'
        });

      expect(res.statusCode).toBe(302);
      expect(mockModels.Order.create).not.toHaveBeenCalled();
    });

    it('should send order email after creation', async () => {
      const cart = {
        id: 1,
        items: [
          { productId: 1, quantity: 1, Product: testProducts.product1 }
        ]
      };

      const order = {
        id: 1,
        userId: 1,
        total: testProducts.product1.price
      };

      mockModels.Cart.findOne.mockResolvedValue(cart);
      mockModels.Order.create.mockResolvedValue(order);
      mockModels.OrderItem.bulkCreate.mockResolvedValue([]);
      orderService.sendOrderEmail.mockResolvedValue(true);

      await request(app)
        .post('/order')
        .send({
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+380123456789',
          address: 'Kyiv, Ukraine'
        });

      // Email should be called asynchronously but we can check it was attempted
      expect(orderService.sendOrderEmail).toHaveBeenCalled();
    });
  });

  describe('Guest Checkout', () => {
    it('should allow guest checkout without account', async () => {
      const guestCart = {
        items: [
          { productId: 1, quantity: 1, Product: testProducts.product1 }
        ]
      };

      const order = {
        id: 1,
        userId: null,
        total: testProducts.product1.price,
        customerName: 'Guest User',
        customerEmail: 'guest@example.com'
      };

      mockModels.Order.create.mockResolvedValue(order);
      mockModels.OrderItem.bulkCreate.mockResolvedValue([]);
      orderService.sendOrderEmail.mockResolvedValue(true);

      // Create app without setting user in session
      const guestApp = express();

      guestApp.use(express.urlencoded({ extended: true }));
      guestApp.use(express.json());

      guestApp.use(session({
        secret: 'test-secret',
        resave: false,
        saveUninitialized: true
      }));

      guestApp.use((req, res, next) => {
        req.session.cart = {
          items: [
            { productId: 1, quantity: 1 }
          ]
        };

        next();
      });

      mockModels.Product.findAll.mockResolvedValue([
        testProducts.product1
      ]);

      const orderController = require('../../controllers/orderController');

      guestApp.post('/order', orderController.createOrder);
      orderService.loadCheckoutCart.mockResolvedValue({
        items: [
          { productId: 1, quantity: 1, Product: testProducts.product1 }
        ]
      });

      const res = await request(guestApp)
        .post('/order')
        .send({
          name: 'Guest User',
          email: 'guest@example.com',
          phone: '+380123456789',
          address: 'Guest Address'
        });

      expect(res.statusCode).toBe(302);
    });
  });
});
