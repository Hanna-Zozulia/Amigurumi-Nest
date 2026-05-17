jest.mock('../../../models', () => ({
  getModels: require('../../helpers/dbMock').mockGetModels
}));

jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash: jest.fn()
}));

jest.mock('../../../config/redis', () => ({
  getRedisClient: jest.fn()
}));

const request = require('supertest');
const express = require('express');
const session = require('express-session');
const path = require('path');

const { mockModels } = require('../../helpers/dbMock');
const { testUsers } = require('../../fixtures/testData');
const bcrypt = require('bcryptjs');

// Setup app
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

  const authController = require('../../../controllers/authController');

  app.post('/login', authController.postLogin);
  app.post('/register', authController.postRegister);
  app.post('/forgot-password', authController.postForgotPassword);
  app.post('/logout', authController.postLogout);

  return app;
};

describe('Auth Controller - Integration Tests', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = createTestApp();
  });

  describe('POST /login', () => {
    it('should authenticate user with correct credentials', async () => {
      const user = {
        ...testUsers.regularUser,
        password: 'hashed-password',
        save: jest.fn(),
        update: jest.fn()
      };

      mockModels.User.findOne.mockResolvedValue(user);
      bcrypt.compare.mockResolvedValue(true);

      const response = await request(app)
        .post('/login')
        .send({
          email: 'john@example.com',
          password: 'password123'
        });

      expect(response.statusCode).toBe(302);
      expect(mockModels.User.findOne).toHaveBeenCalledWith({
        where: { email: 'john@example.com' }
      });
    });

    it('should reject login with incorrect password', async () => {
      const user = {
        ...testUsers.regularUser,
        password: 'hashed-password'
      };

      mockModels.User.findOne.mockResolvedValue(user);
      bcrypt.compare.mockResolvedValue(false);

      const response = await request(app)
        .post('/login')
        .send({
          email: 'john@example.com',
          password: 'wrongpassword'
        });

      expect(response.statusCode).toBe(302);
    });

    it('should reject login with non-existent user', async () => {
      mockModels.User.findOne.mockResolvedValue(null);

      const response = await request(app)
        .post('/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123'
        });

      expect(response.statusCode).toBe(302);
    });
  });

  describe('POST /register', () => {
    it('should create new user with valid data', async () => {
      bcrypt.hash.mockResolvedValue('hashed-password');

      const newUser = {
        ...testUsers.regularUser,
        id: 3,
        password: 'hashed-password'
      };

      mockModels.User.findOne.mockResolvedValue(null);
      mockModels.User.create.mockResolvedValue(newUser);

      const response = await request(app)
        .post('/register')
        .send({
          name: 'New User',
          email: 'newuser@example.com',
          password: 'SecurePassword123.',
          confirm_password: 'SecurePassword123.'
        });

      expect(response.statusCode).toBe(302);

      expect(mockModels.User.findOne).toHaveBeenCalledWith({
        where: { email: 'newuser@example.com' }
      });

      expect(mockModels.User.create).toHaveBeenCalled();
      expect(bcrypt.hash).toHaveBeenCalled();
    });

    it('should reject registration with existing email', async () => {
      mockModels.User.findOne.mockResolvedValue(testUsers.regularUser);

      const response = await request(app)
        .post('/register')
        .send({
          name: 'Test User',
          email: 'john@example.com',
          password: 'SecurePassword123.',
          confirm_password: 'SecurePassword123'
        });

      expect(response.statusCode).toBe(302);
      expect(mockModels.User.create).not.toHaveBeenCalled();
    });

    it('should reject registration with password mismatch', async () => {
      mockModels.User.findOne.mockResolvedValue(null);

      const response = await request(app)
        .post('/register')
        .send({
          name: 'Test User',
          email: 'test@example.com',
          password: 'SecurePassword123.',
          confirm_password: 'DifferentPassword'
        });

      expect(response.statusCode).toBe(302);
      expect(mockModels.User.create).not.toHaveBeenCalled();
    });
  });

  describe('POST /logout', () => {
    it('should destroy session on logout', async () => {
      const response = await request(app)
        .post('/logout');

      expect(response.statusCode).toBe(302);
    });
  });
});