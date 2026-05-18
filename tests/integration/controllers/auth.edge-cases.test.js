jest.mock('../../../models', () => ({
  getModels: require('../../helpers/dbMock').mockGetModels
}));

jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash: jest.fn()
}));

jest.mock('nodemailer', () => ({
  createTransport: jest.fn()
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
const nodemailer = require('nodemailer');

/**
 * Build an express app configured for auth edge-case integration tests. It
 * mounts auth routes used to exercise error handling and edge branches.
 */
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
  app.post('/reset-password/:token', authController.postResetPassword);

  return app;
};

describe('Auth Controller - Edge Cases & Error Paths', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = createTestApp();
    process.env.MAIL_USER = undefined;
    process.env.MAIL_PASS = undefined;
  });

  describe('POST /register - Password validation branches', () => {
    it('should reject registration when passwords do not match', async () => {
      mockModels.User.findOne.mockResolvedValue(null);
      bcrypt.hash.mockResolvedValue('hashed-password');

      const response = await request(app)
        .post('/register')
        .send({
          name: 'New User',
          email: 'test@example.com',
          password: 'SecurePassword123.',
          confirm_password: 'DifferentPassword123.'
        });

      expect(response.statusCode).toBe(302);
      expect(response.headers.location).toContain('error=mismatch');
      expect(mockModels.User.create).not.toHaveBeenCalled();
    });

    it('should reject registration with invalid password format', async () => {
      mockModels.User.findOne.mockResolvedValue(null);

      const response = await request(app)
        .post('/register')
        .send({
          name: 'New User',
          email: 'test@example.com',
          password: 'weak',
          confirm_password: 'weak'
        });

      expect(response.statusCode).toBe(302);
      expect(response.headers.location).toContain('error=password');
      expect(mockModels.User.create).not.toHaveBeenCalled();
    });

    it('should reject registration with missing email', async () => {
      const response = await request(app)
        .post('/register')
        .send({
          name: 'New User',
          password: 'SecurePassword123.',
          confirm_password: 'SecurePassword123.'
        });

      expect(response.statusCode).toBe(302);
      expect(mockModels.User.create).not.toHaveBeenCalled();
    });
  });

  describe('POST /login - Database error branches', () => {
    it('should handle database error on findOne (redirects with error)', async () => {
      mockModels.User.findOne.mockRejectedValue(new Error('DB error'));

      const response = await request(app)
        .post('/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      expect(response.statusCode).toBe(302);
      expect(response.headers.location).toContain('error=1');
    });

    it('should handle bcrypt.compare error (redirects with error)', async () => {
      mockModels.User.findOne.mockResolvedValue({
        ...testUsers.regularUser,
        password: 'hashed-password'
      });
      bcrypt.compare.mockRejectedValue(new Error('bcrypt error'));

      const response = await request(app)
        .post('/login')
        .send({
          email: 'john@example.com',
          password: 'password123'
        });

      expect(response.statusCode).toBe(302);
      expect(response.headers.location).toContain('error=1');
    });
  });

  describe('POST /forgot-password - Email recovery branches', () => {
    it('should handle forgot password with non-existent user', async () => {
      mockModels.User.findOne.mockResolvedValue(null);

      const response = await request(app)
        .post('/forgot-password')
        .send({
          email: 'nonexistent@example.com'
        });

      // Should redirect regardless (security: no user enumeration)
      expect(response.statusCode).toBe(302);
      expect(response.headers.location).toContain('sent=1');
    });

    it('should handle forgot password with email service unavailable', async () => {
      const updateMock = jest.fn().mockResolvedValue(true);
      mockModels.User.findOne.mockResolvedValue({
        ...testUsers.regularUser,
        update: updateMock
      });

      // No mail transporter configured
      const response = await request(app)
        .post('/forgot-password')
        .send({
          email: 'john@example.com'
        });

      expect(response.statusCode).toBe(302);
      expect(response.headers.location).toContain('sent=1');
      expect(updateMock).toHaveBeenCalled();
    });

    it('should send reset email when service is configured', async () => {
      const sendMailMock = jest.fn().mockResolvedValue({});
      nodemailer.createTransport.mockReturnValue({ sendMail: sendMailMock });

      process.env.MAIL_USER = 'test@gmail.com';
      process.env.MAIL_PASS = 'password';
      process.env.MAIL_FROM = 'noreply@amigurumi.com';

      const updateMock = jest.fn().mockResolvedValue(true);
      mockModels.User.findOne.mockResolvedValue({
        ...testUsers.regularUser,
        update: updateMock
      });

      const response = await request(app)
        .post('/forgot-password')
        .send({
          email: 'john@example.com'
        });

      expect(response.statusCode).toBe(302);
      expect(response.headers.location).toContain('sent=1');
      expect(updateMock).toHaveBeenCalled();
    });

    it('should handle database error during reset token update gracefully', async () => {
      const updateMock = jest.fn().mockRejectedValue(new Error('DB error'));
      mockModels.User.findOne.mockResolvedValue({
        ...testUsers.regularUser,
        update: updateMock
      });

      const response = await request(app)
        .post('/forgot-password')
        .send({
          email: 'john@example.com'
        });

      // Still redirects, but update fails (logged as error)
      expect(response.statusCode).toBe(302);
    });
  });

  describe('POST /reset-password/:token - Token validation branches', () => {
    it('should handle reset with missing token', async () => {
      const response = await request(app)
        .post('/reset-password/')
        .send({
          password: 'NewSecurePassword123.',
          confirm_password: 'NewSecurePassword123.'
        });

      expect(response.statusCode).toBe(404); // No route matches
    });

    it('should redirect reset with mismatched passwords', async () => {
      const response = await request(app)
        .post('/reset-password/valid-token')
        .send({
          password: 'NewSecurePassword123.',
          confirm_password: 'DifferentPassword123.'
        });

      expect(response.statusCode).toBe(302);
      expect(response.headers.location).toContain('error=mismatch');
    });

    it('should accept valid reset with matching passwords', async () => {
      bcrypt.hash.mockResolvedValue('new-hashed-password');

      const updateMock = jest.fn().mockResolvedValue(true);
      mockModels.User.findOne.mockResolvedValue({
        ...testUsers.regularUser,
        update: updateMock
      });

      const response = await request(app)
        .post('/reset-password/valid-token')
        .send({
          password: 'NewSecurePassword123.',
          confirm_password: 'NewSecurePassword123.'
        });

      expect(response.statusCode).toBe(302);
      expect(response.headers.location).toContain('login');
      expect(updateMock).toHaveBeenCalled();
    });

    it('should reject reset with invalid password format', async () => {
      const response = await request(app)
        .post('/reset-password/valid-token')
        .send({
          password: 'weak',
          confirm_password: 'weak'
        });

      expect(response.statusCode).toBe(302);
      expect(response.headers.location).toContain('error=password');
    });
  });

  describe('POST /logout - Session cleanup', () => {
    it('should clear session on logout', async () => {
      const agent = request.agent(app);

      // First login
      await agent
        .post('/login')
        .send({
          email: 'john@example.com',
          password: 'password123'
        });

      mockModels.User.findOne.mockResolvedValue({
        ...testUsers.regularUser,
        password: 'hashed-password'
      });

      bcrypt.compare.mockResolvedValue(true);

      // Then logout
      const response = await agent.post('/logout');

      expect(response.statusCode).toBe(302);
    });
  });
});
