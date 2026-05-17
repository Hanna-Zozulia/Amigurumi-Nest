let mockCreateTransport;
let mockReadFile;

jest.mock('nodemailer', () => {
  mockCreateTransport = jest.fn(() => ({ sendMail: jest.fn() }));
  return { createTransport: mockCreateTransport };
});

jest.mock('fs/promises', () => {
  mockReadFile = jest.fn();
  return { readFile: mockReadFile };
});

const nodemailer = require('nodemailer');
const fs = require('fs/promises');
const emailService = require('../../../services/emailService');

describe('emailService', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('getMailTransporter', () => {
    it('uses host credentials when available', () => {
      process.env.MAIL_HOST = 'smtp.test.local';
      process.env.MAIL_USER = 'user@test.local';
      process.env.MAIL_PASS = 'secret';

      const transporter = emailService.getMailTransporter();

      expect(transporter).toBeDefined();
      expect(nodemailer.createTransport).toHaveBeenCalledWith({
        host: 'smtp.test.local',
        port: 587,
        secure: false,
        auth: { user: 'user@test.local', pass: 'secret' }
      });
    });

    it('uses service auth when host is missing', () => {
      delete process.env.MAIL_HOST;
      process.env.MAIL_USER = 'user@test.local';
      process.env.MAIL_PASS = 'secret';

      emailService.getMailTransporter();

      expect(nodemailer.createTransport).toHaveBeenCalledWith({
        service: 'gmail',
        auth: { user: 'user@test.local', pass: 'secret' }
      });
    });

    it('returns null when credentials are missing', () => {
      delete process.env.MAIL_HOST;
      delete process.env.MAIL_USER;
      delete process.env.MAIL_PASS;

      expect(emailService.getMailTransporter()).toBeNull();
    });
  });

  describe('buildInlineImageAttachment', () => {
    it('returns null for empty input', async () => {
      await expect(emailService.buildInlineImageAttachment('', 'product')).resolves.toBeNull();
    });

    it('builds attachment from data uri', async () => {
      const result = await emailService.buildInlineImageAttachment('data:image/png;base64,aGVsbG8=', 'product');

      expect(result).toEqual(expect.objectContaining({
        src: expect.stringMatching(/^cid:/),
        attachment: expect.objectContaining({
          filename: 'product.png',
          contentType: 'image/png'
        })
      }));
    });

    it('returns null for invalid data uri', async () => {
      await expect(emailService.buildInlineImageAttachment('data:image/png;base64', 'product')).resolves.toBeNull();
    });

    it('builds attachment from remote url when fetch succeeds', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: jest.fn().mockResolvedValue(Uint8Array.from([1, 2, 3]).buffer),
        headers: { get: jest.fn(() => 'image/jpeg') }
      });

      const result = await emailService.buildInlineImageAttachment('https://cdn.test/image.jpg', 'product');

      expect(result.attachment.filename).toMatch(/\.jpg$/);
      expect(global.fetch).toHaveBeenCalledWith('https://cdn.test/image.jpg');
      delete global.fetch;
    });

    it('returns null when fetch is unavailable or file read fails', async () => {
      delete global.fetch;
      await expect(emailService.buildInlineImageAttachment('https://cdn.test/image.jpg', 'product')).resolves.toBeNull();

      mockReadFile.mockRejectedValueOnce(new Error('missing'));
      await expect(emailService.buildInlineImageAttachment('/img/uploads/missing.png', 'product')).resolves.toBeNull();
    });

    it('builds attachment from local file', async () => {
      mockReadFile.mockResolvedValueOnce(Buffer.from('hello'));

      const result = await emailService.buildInlineImageAttachment('/img/uploads/cat.png', 'product');

      expect(result.attachment.content).toEqual(Buffer.from('hello'));
      expect(result.attachment.filename).toBe('cat.png');
    });
  });

  describe('template helpers', () => {
    it('builds product cards, lines, and order messages', () => {
      const item = {
        name: 'Cat',
        quantity: 2,
        lineTotal: 50,
        imageCid: 'cid:123',
        fallbackImageUrl: 'https://shop.test/cat.png'
      };

      const card = emailService.buildProductCardHtml(item);
      expect(card).toContain('cid:123');
      expect(emailService.buildProductLinesText([item])).toContain('Cat x2 = 50.00 EUR');
      expect(emailService.buildOrderEmailText({
        customerName: 'John',
        customerEmail: 'john@test.com',
        customerPhone: '+380',
        customerAddress: 'Kyiv',
        customerNotes: '',
        total: 50
      }, '- Cat')).toContain('Итого: 50.00 EUR');
      expect(emailService.buildOrderEmailHtml({
        customerName: 'John',
        customerEmail: 'john@test.com',
        customerPhone: '+380',
        customerAddress: 'Kyiv',
        customerNotes: '',
        total: 50
      }, '<div>cards</div>')).toContain('cards');
    });
  });
});
