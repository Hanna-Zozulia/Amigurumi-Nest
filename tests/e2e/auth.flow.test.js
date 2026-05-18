jest.mock('../../models', () => ({
  getModels: require('../helpers/dbMock').mockGetModels,
  initDb: jest.fn(async () => Promise.resolve())
}));

jest.mock('../../config/redis', () => ({
  getRedisClient: jest.fn(() => require('../helpers/redisMock')),
  initRedis: jest.fn(async () => Promise.resolve())
}));

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: jest.fn().mockResolvedValue(undefined)
  }))
}));

const request = require('supertest');
const express = require('express');
const session = require('express-session');
const { getModels } = require('../../models');
const { mockModels } = require('../helpers/dbMock');
const bcrypt = require('bcryptjs');

/**
 * Create an express app instance configured with the authentication routes
 * used by E2E tests. Uses real controllers but keeps sessions/cookies simple
 * for test isolation.
 */
const createApp = () => {
  const app = express();
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());
  app.use(session({
    secret: 'test-secret',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false, httpOnly: true }
  }));

  app.set('view engine', 'ejs');

  // Auth routes
  const authController = require('../../controllers/authController');
  app.post('/login', authController.postLogin);
  app.post('/register', authController.postRegister);
  app.get('/forgot-password', authController.getForgotPassword);
  app.post('/forgot-password', authController.postForgotPassword);
  app.post('/logout', authController.postLogout);

  return app;
};

describe('Authentication Flow - E2E Tests', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = createApp();
  });

  describe('User Registration and Login Flow', () => {
    it('should complete full auth flow: register -> login -> logout', async () => {
      const newUser = {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        password: await bcrypt.hash('SecurePassword123', 10),
        role: 'user'
      };

      // Step 1: Check email doesn't exist
      mockModels.User.findOne.mockResolvedValueOnce(null);
      
      // Step 2: Create user
      mockModels.User.create.mockResolvedValueOnce(newUser);

      const registerRes = await request(app)
        .post('/register')
        .send({
          name: 'John Doe',
          email: 'john@example.com',
          password: 'SecurePassword123',
          passwordConfirm: 'SecurePassword123'
        });

      expect(registerRes.statusCode).toBe(302);

      // Step 3: Login with new user
      mockModels.User.findOne.mockResolvedValueOnce(newUser);
      
      const loginRes = await request(app)
        .post('/login')
        .send({
          email: 'john@example.com',
          password: 'SecurePassword123'
        })
        .expect(302);

      expect(loginRes.text).toContain('Redirecting');

      // Step 4: Logout
      const logoutRes = await request(app)
        .post('/logout')
        .expect(302);

      expect(logoutRes.text).toContain('Redirecting');
    });
  });

  describe('Password Reset Flow', () => {
    it('should handle forgot password request', async () => {
      const user = {
        id: 1,
        email: 'john@example.com',
        update: jest.fn().mockResolvedValue({})
      };

      mockModels.User.findOne.mockResolvedValue(user);

      const response = await request(app)
        .post('/forgot-password')
        .send({ email: 'john@example.com' });

      expect(response.statusCode).toBe(302);
      expect(mockModels.User.findOne).toHaveBeenCalledWith({
        where: { email: 'john@example.com' }
      });
    });
  });

  describe('Failed Login Attempts', () => {
    it('should reject login with wrong password', async () => {
      const user = {
        id: 1,
        email: 'john@example.com',
        password: await bcrypt.hash('CorrectPassword', 10),
        name: 'John'
      };

      mockModels.User.findOne.mockResolvedValue(user);

      const response = await request(app)
        .post('/login')
        .send({
          email: 'john@example.com',
          password: 'WrongPassword'
        });

      expect(response.statusCode).toBe(302);
    });

    it('should reject login with non-existent user', async () => {
      mockModels.User.findOne.mockResolvedValue(null);

      const response = await request(app)
        .post('/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password'
        });

      expect(response.statusCode).toBe(302);
    });
  });
});
