// tests/helpers/setupTests.js - инициализация тестовой среды

process.env.NODE_ENV = 'test';
process.env.SESSION_SECRET = 'test-secret-key';
process.env.DATABASE_HOST = 'localhost';
process.env.DATABASE_USER = 'test';
process.env.DATABASE_PASS = 'test';
process.env.DATABASE_NAME = 'amigurumi_test';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = 6379;
process.env.REDIS_PASSWORD = '';
process.env.PORT = 3001;
process.env.SESSION_IDLE_TIMEOUT_MS = 30 * 60 * 1000;
process.env.ADMIN_SESSION_IDLE_TIMEOUT_MS = 15 * 60 * 1000;
process.env.MAIL_HOST = 'smtp.gmail.com';
process.env.MAIL_PORT = 587;
process.env.MAIL_USER = 'test@gmail.com';
process.env.MAIL_PASS = 'test-password';
process.env.MAIL_FROM = 'test@gmail.com';
process.env.ORDER_RECEIVER_EMAIL = 'test@gmail.com';

// Очистка логов в консоли во время тестов
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
});