// tests/e2e/api.endpoints.test.js

jest.mock('../../models', () => ({
  getModels: require('../helpers/dbMock').mockGetModels,
  initDb: jest.fn(async () => Promise.resolve())
}));

jest.mock('../../config/redis', () => ({
  getRedisClient: jest.fn(() => require('../helpers/redisMock')),
  initRedis: jest.fn(async () => Promise.resolve())
}));

jest.mock('../../middleware/cacheMiddleware', () => ({
  cacheGet: jest.fn((options) => (req, res, next) => next())
}));

const request = require('supertest');
const express = require('express');
const session = require('express-session');
const { getModels } = require('../../models');
const { mockModels } = require('../helpers/dbMock');
const { testProducts } = require('../fixtures/testData');

const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use(session({
    secret: 'test-secret',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
  }));

  const apiController = require('../../controllers/productApiController');
  const cartController = require('../../controllers/cartApiController');

  // Product API routes
  app.get('/api/products', apiController.list);
  app.get('/api/products/:id', apiController.getOne);
  app.post('/api/products', (req, res, next) => {
    req.session.user = { id: 2, role: 'admin' };
    next();
  }, apiController.create);
  app.put('/api/products/:id', (req, res, next) => {
    req.session.user = { id: 2, role: 'admin' };
    next();
  }, apiController.update);
  app.delete('/api/products/:id', (req, res, next) => {
    req.session.user = { id: 2, role: 'admin' };
    next();
  }, apiController.remove);

  // Cart API routes
  app.get('/api/cart', (req, res, next) => {
    req.session.user = { id: 1 };
    next();
  }, cartController.getCart);

  app.post('/api/cart/add', (req, res, next) => {
    req.session.user = { id: 1 };
    next();
  }, cartController.add);

  app.post('/api/cart/remove', (req, res, next) => {
    req.session.user = { id: 1 };
    next();
  }, cartController.removeOne);

  app.post('/api/cart/clear', (req, res, next) => {
    req.session.user = { id: 1 };
    next();
  }, cartController.clear);

  return app;
};

describe('API Endpoints - E2E Tests', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = createApp();
  });

  describe('Products API', () => {
    describe('GET /api/products', () => {
      it('should return list of products', async () => {
        mockModels.Product.findAll.mockResolvedValue([testProducts.product1, testProducts.product2]);

        const res = await request(app)
          .get('/api/products')
          .expect('Content-Type', /json/)
          .expect(200);

        expect(res.body).toBeInstanceOf(Array);
      });

      it('should return empty array when no products', async () => {
        mockModels.Product.findAll.mockResolvedValue([]);

        const res = await request(app)
          .get('/api/products')
          .expect(200);

        expect(res.body).toEqual([]);
      });
    });

    describe('GET /api/products/:id', () => {
      it('should return single product', async () => {
        mockModels.Product.findByPk.mockResolvedValue(testProducts.product1);

        const res = await request(app)
          .get('/api/products/1')
          .expect(200);

        expect(res.body).toHaveProperty('id', 1);
        expect(res.body).toHaveProperty('name');
      });

      it('should return 404 for non-existent product', async () => {
        mockModels.Product.findByPk.mockResolvedValue(null);

        const res = await request(app)
          .get('/api/products/999')
          .expect(404);

        expect(res.body).toHaveProperty('error', 'Not found');
      });
    });

    describe('POST /api/products', () => {
      it('should create product (admin only)', async () => {
        const newProduct = { ...testProducts.product1, id: 3 };
        mockModels.Product.create.mockResolvedValue(newProduct);

        const res = await request(app)
          .post('/api/products')
          .send({
            name: 'New Product',
            desc: 'Description',
            price: 29.99,
            categoryId: 1
          })
          .expect(201);

        expect(res.body).toHaveProperty('id', 3);
        expect(res.body).toHaveProperty('name', testProducts.product1.name);
      });
    });

    describe('PUT /api/products/:id', () => {
      it('should update product (admin only)', async () => {
        const product = {
          ...testProducts.product1,
          update: jest.fn().mockImplementation(async (payload) => {
            Object.assign(product, payload);
            return product;
          })
        };

        mockModels.Product.findByPk.mockResolvedValue(product);

        const res = await request(app)
          .put('/api/products/1')
          .send({
            name: 'Updated',
            desc: 'Updated description',
            price: 31.5,
            categoryId: 2
          })
          .expect(200);

        expect(res.body).toHaveProperty('name', 'Updated');
        expect(product.update).toHaveBeenCalledWith(expect.objectContaining({
          name: 'Updated',
          desc: 'Updated description',
          price: 31.5,
          categoryId: 2
        }));
      });
    });

    describe('DELETE /api/products/:id', () => {
      it('should delete product (admin only)', async () => {
        mockModels.Product.findByPk.mockResolvedValue({
          ...testProducts.product1,
          destroy: jest.fn()
        });

        const res = await request(app)
          .delete('/api/products/1')
          .expect(204);

        expect(res.text).toBe('');
      });
    });
  });

  describe('Cart API', () => {
    describe('GET /api/cart', () => {
      it('should return user cart (auth required)', async () => {
        const mockCart = {
          id: 1,
          userId: 1,
          items: []
        };

        mockModels.Cart.findOne.mockResolvedValue(mockCart);

        const res = await request(app)
          .get('/api/cart')
          .expect(200);

        expect(res.body).toHaveProperty('id', 1);
      });

      it('should reject unauthenticated request', async () => {
        const noAuthApp = express();
        noAuthApp.use(express.json());
        noAuthApp.use(session({
          secret: 'test-secret',
          resave: false,
          saveUninitialized: true,
          cookie: { secure: false }
        }));
        const cartController = require('../../controllers/cartApiController');
        noAuthApp.get('/api/cart', cartController.getCart);

        const res = await request(noAuthApp)
          .get('/api/cart')
          .expect(401);

        expect(res.body).toHaveProperty('error');
      });
    });

    describe('POST /api/cart/add', () => {
      it('should add item to cart', async () => {
        const mockCart = { id: 1, items: [] };
        const mockItem = { id: 1, quantity: 1, productId: 1 };

        mockModels.Cart.findOne.mockResolvedValue(mockCart);
        mockModels.CartItem.findOne.mockResolvedValue(null);
        mockModels.CartItem.create.mockResolvedValue(mockItem);

        const res = await request(app)
          .post('/api/cart/add')
          .send({ productId: 1 })
          .expect(200);

        expect(res.body).toHaveProperty('success', true);
      });
    });

    describe('POST /api/cart/remove', () => {
      it('should remove item from cart', async () => {
        const mockCart = { id: 1 };
        const mockItem = { id: 1, quantity: 1, destroy: jest.fn() };

        mockModels.Cart.findOne.mockResolvedValue(mockCart);
        mockModels.CartItem.findOne.mockResolvedValue(mockItem);

        const res = await request(app)
          .post('/api/cart/remove')
          .send({ productId: 1 })
          .expect(200);

        expect(res.body).toHaveProperty('success', true);
      });
    });

    describe('POST /api/cart/clear', () => {
      it('should clear entire cart', async () => {
        const mockCart = { id: 1 };

        mockModels.Cart.findOne.mockResolvedValue(mockCart);
        mockModels.CartItem.destroy.mockResolvedValue(3);

        const res = await request(app)
          .post('/api/cart/clear')
          .expect(200);

        expect(res.body).toHaveProperty('success', true);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle server errors gracefully', async () => {
      mockModels.Product.findAll.mockRejectedValue(new Error('DB Error'));

      const res = await request(app)
        .get('/api/products')
        .expect(500);

      expect(res.body).toHaveProperty('error');
    });
  });
});
