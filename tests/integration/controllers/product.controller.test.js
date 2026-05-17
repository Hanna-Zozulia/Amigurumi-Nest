jest.mock('../../../models', () => ({
  getModels: require('../../helpers/dbMock').mockGetModels
}));

jest.mock('../../../utils/cache', () => ({
  cached: jest.fn((key, ttl, loaderFn) => loaderFn())
}));

jest.mock('../../../services/cacheService', () => ({
  invalidateProductCache: jest.fn()
}));

jest.mock('fs/promises', () => ({
  unlink: jest.fn()
}));

const request = require('supertest');
const express = require('express');
const session = require('express-session');
const { mockModels } = require('../../helpers/dbMock');
const { testProducts } = require('../../fixtures/testData');

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

  // 🔥 FIX 1: всегда есть user (иначе showPage падает)
  app.use((req, res, next) => {
    req.session.user = { id: 1, role: 'user' };
    next();
  });

  const productController = require('../../../controllers/productController');

  app.get('/', productController.homePage);
  app.get('/catalog', productController.listPage);
  app.get('/top3', productController.top3Page);
  app.get('/product/:id', productController.showPage);

  app.get('/products/new', (req, res, next) => {
    req.session.user = { id: 2, role: 'admin' };
    next();
  }, productController.newForm);

  app.post('/products', (req, res, next) => {
    req.session.user = { id: 2, role: 'admin' };
    req.files = {
      image: [{ filename: 'test.jpg' }],
      image2: [{ filename: 'test-2.jpg' }]
    };
    next();
  }, productController.create);

  app.get('/products/:id/edit', (req, res, next) => {
    req.session.user = { id: 2, role: 'admin' };
    next();
  }, productController.editForm);

  app.post('/products/:id', (req, res, next) => {
    req.session.user = { id: 2, role: 'admin' };
    next();
  }, productController.update);

  app.post('/products/:id/delete', (req, res, next) => {
    req.session.user = { id: 2, role: 'admin' };
    next();
  }, productController.remove);

  return app;
};

describe('Product Controller - Integration Tests', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();

    // 🔥 FIX 2: ВСЕ зависимости, которые используются в controller
    mockModels.Product.findAll.mockResolvedValue([]);
    mockModels.Product.findByPk.mockResolvedValue(testProducts.product1);
    mockModels.Product.increment.mockResolvedValue();
    mockModels.Product.create.mockResolvedValue(testProducts.product1);

    mockModels.Category.findAll.mockResolvedValue([]);

    // 🔥 FIX 3: ВАЖНО — Review используется в homePage/showPage
    mockModels.Review.findAll.mockResolvedValue([]);

    mockModels.User.findAll = jest.fn();
    mockModels.User.findOne = jest.fn();

    app = createTestApp();
  });

  describe('GET /', () => {
    it('should render homepage with products', async () => {
      mockModels.Product.findAll.mockResolvedValue([
        testProducts.product1,
        testProducts.product2
      ]);

      const response = await request(app).get('/');

      expect(response.statusCode).toBe(200);
      expect(mockModels.Product.findAll).toHaveBeenCalled();
    });
  });

  describe('GET /catalog', () => {
    it('should render catalog page', async () => {
      mockModels.Product.findAll.mockResolvedValue([testProducts.product1]);

      const response = await request(app).get('/catalog');

      expect(response.statusCode).toBe(200);
    });

    it('should filter products by category', async () => {
      const response = await request(app).get('/catalog?filter=cat-1');

      expect(response.statusCode).toBe(200);
    });
  });

  describe('GET /top3', () => {
    it('should render top 3 products page', async () => {
      mockModels.Product.findAll.mockResolvedValue([testProducts.product1]);

      const response = await request(app).get('/top3');

      expect(response.statusCode).toBe(200);
    });
  });

  describe('GET /product/:id', () => {
    it('should render product detail page', async () => {
      mockModels.Product.findByPk.mockResolvedValue(testProducts.product1);

      const response = await request(app).get('/product/1');

      expect(response.statusCode).toBe(200);
      expect(mockModels.Product.findByPk)
        .toHaveBeenCalledWith(1, expect.any(Object));
    });

    it('should return 404 for non-existent product', async () => {
      mockModels.Product.findByPk.mockResolvedValue(null);

      const response = await request(app).get('/product/999');

      expect(response.statusCode).toBe(404);
    });

    it('should increment product views', async () => {
      mockModels.Product.findByPk.mockResolvedValue(testProducts.product1);

      await request(app).get('/product/1');

      expect(mockModels.Product.increment)
        .toHaveBeenCalledWith('views', { where: { id: 1 } });
    });
  });

  describe('POST /products', () => {
    it('should create product with image', async () => {
      const newProduct = { ...testProducts.product1, id: 3 };

      mockModels.Product.create.mockResolvedValue(newProduct);

      const response = await request(app)
        .post('/products')
        .send({
          name: 'New Product',
          desc: 'Description',
          price: '29.99',
          categoryId: '1',
          isNew: 'on'
        });

      expect(response.statusCode).toBe(302);
      expect(mockModels.Product.create).toHaveBeenCalled();
    });
  });

  describe('POST /products/:id', () => {
    it('should update product', async () => {
      const product = {
        ...testProducts.product1,
        update: jest.fn().mockResolvedValue(testProducts.product1)
      };

      mockModels.Product.findByPk.mockResolvedValue(product);

      const response = await request(app)
        .post('/products/1')
        .send({
          name: 'Updated Product',
          desc: 'Updated description',
          price: '39.99',
          categoryId: '1'
        });

      expect(response.statusCode).toBe(302);
      expect(product.update).toHaveBeenCalled();
    });
  });

  describe('POST /products/:id/delete', () => {
    it('should delete product and images', async () => {
      const product = {
        ...testProducts.product1,
        image: '/img/uploads/test1.jpg',
        image2: '/img/uploads/test2.jpg',
        destroy: jest.fn()
      };

      mockModels.Product.findByPk.mockResolvedValue(product);

      const response = await request(app)
        .post('/products/1/delete')
        .send({});

      expect(response.statusCode).toBe(302);
      expect(product.destroy).toHaveBeenCalled();
    });

    it('should handle missing product', async () => {
      mockModels.Product.findByPk.mockResolvedValue(null);

      const response = await request(app)
        .post('/products/999/delete')
        .send({});

      expect(response.statusCode).toBe(404);
    });
  });

  describe('Additional Coverage - Cache & Error Paths', () => {
    it('should handle empty product reviews', async () => {
      mockModels.Product.findByPk.mockResolvedValue({
        id: 1,
        name: 'Product',
        category: { id: 1 }
      });
      mockModels.Product.increment.mockResolvedValue(true);
      mockModels.Review.findAll.mockResolvedValue([]);

      const response = await request(app).get('/product/1');

      expect(response.statusCode).toBe(200);
    });

    it('should handle product with null category', async () => {
      mockModels.Product.findByPk.mockResolvedValue({
        id: 1,
        name: 'Product',
        category: null
      });
      mockModels.Product.increment.mockResolvedValue(true);
      mockModels.Review.findAll.mockResolvedValue([]);

      const response = await request(app).get('/product/1');

      expect(response.statusCode).toBe(200);
    });

    it('should handle database error on product fetch', async () => {
      mockModels.Product.findByPk.mockRejectedValue(new Error('DB Error'));

      const response = await request(app).get('/product/1');

      expect(response.statusCode).toBe(500);
    });

    it('should handle file deletion errors gracefully', async () => {
      const fs = require('fs/promises');
      fs.unlink.mockRejectedValue(new Error('File not found'));

      mockModels.Product.findByPk.mockResolvedValue({
        id: 1,
        image: '/img/test.jpg',
        image2: '/img/test2.jpg',
        destroy: jest.fn().mockResolvedValue(true)
      });

      const response = await request(app)
        .post('/products/1/delete')
        .send({});

      expect(response.statusCode).toBe(302);
    });

    it('should handle creation without secondary image', async () => {
      mockModels.Product.create.mockResolvedValue({
        id: 1,
        name: 'New Product',
        image: '/img/uploads/test.jpg',
        image2: ''
      });

      const response = await request(app)
        .post('/products')
        .send({
          name: 'Test Product',
          price: 100,
          categoryId: 1,
          desc: 'Test'
        });

      expect(response.statusCode).toBe(302);
      expect(mockModels.Product.create).toHaveBeenCalled();
    });

    it('should handle update with no image changes', async () => {
      mockModels.Product.findByPk.mockResolvedValue({
        id: 1,
        name: 'Original',
        image: '/img/original.jpg',
        image2: '/img/original2.jpg',
        update: jest.fn().mockResolvedValue(true)
      });

      const response = await request(app)
        .post('/products/1')
        .send({
          name: 'Updated',
          categoryId: 1,
          price: 150,
          desc: 'Updated desc'
        });

      expect(response.statusCode).toBe(302);
    });
  });
});