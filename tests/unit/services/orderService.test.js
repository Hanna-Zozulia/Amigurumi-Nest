const { mockModels } = require('../../helpers/dbMock');

jest.mock('../../../models', () => ({
  getModels: jest.fn(() => require('../../helpers/dbMock').mockModels)
}));

jest.mock('../../../services/emailService', () => ({
  getMailTransporter: jest.fn(),
  buildInlineImageAttachment: jest.fn(),
  buildProductCardHtml: jest.fn(() => '<div class="card"></div>'),
  buildProductLinesText: jest.fn(() => 'lines'),
  buildOrderEmailText: jest.fn(() => 'text'),
  buildOrderEmailHtml: jest.fn(() => '<div>html</div>')
}));

jest.mock('../../../utils/htmlUtils', () => ({
  getSiteBaseUrl: jest.fn(() => 'https://shop.test'),
  getAbsoluteImageUrl: jest.fn((imagePath, baseUrl) => `${baseUrl}/${String(imagePath).replace(/^\//, '')}`)
}));

const emailService = require('../../../services/emailService');
const htmlUtils = require('../../../utils/htmlUtils');
const orderService = require('../../../services/orderService');

describe('orderService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockModels.Cart.findOne.mockReset();
    mockModels.CartItem.findOne.mockReset();
    mockModels.Product.findAll.mockReset();
  });

  /**
   * loadCheckoutCart: tests for loading the checkout cart from either the DB
   * (authenticated users) or session (guest users).
   */
  describe('loadCheckoutCart', () => {
    it('loads cart for authenticated user and falls back to empty cart', async () => {
      mockModels.Cart.findOne.mockResolvedValueOnce({ id: 1, items: [{ productId: 2, quantity: 3 }] });

      const cart = await orderService.loadCheckoutCart({ session: { user: { id: 7 } } }, mockModels.Product);
      expect(cart.items).toHaveLength(1);

      mockModels.Cart.findOne.mockResolvedValueOnce(null);
      await expect(orderService.loadCheckoutCart({ session: { user: { id: 7 } } }, mockModels.Product)).resolves.toEqual({ items: [] });
    });

    it('loads guest cart from session items', async () => {
      mockModels.Product.findAll.mockResolvedValueOnce([{ id: 1, name: 'Cat' }]);

      const cart = await orderService.loadCheckoutCart({
        session: {
          cart: { items: [{ productId: 1, quantity: 2 }, { productId: 2, quantity: 1 }] }
        }
      }, mockModels.Product);

      expect(mockModels.Product.findAll).toHaveBeenCalledWith({ where: { id: [1, 2] } });
      expect(cart.items).toEqual([
        { productId: 1, quantity: 2, Product: { id: 1, name: 'Cat' } },
        { productId: 2, quantity: 1, Product: null }
      ]);
    });

    it('returns empty cart for guest without items', async () => {
      await expect(orderService.loadCheckoutCart({ session: { cart: { items: [] } } }, mockModels.Product)).resolves.toEqual({ items: [] });
    });
  });

  /**
   * calculateCartTotal: verifies summation of item prices and quantities.
   */
  describe('calculateCartTotal', () => {
    it('sums cart items', () => {
      expect(orderService.calculateCartTotal({
        items: [
          { quantity: 2, Product: { price: 10 } },
          { quantity: 1, Product: { price: 5.5 } }
        ]
      })).toBe(25.5);
    });
  });

  /**
   * sendOrderEmail: ensures the service composes and sends emails when a
   * transporter is available and handles missing transporter gracefully.
   */
  describe('sendOrderEmail', () => {
    it('returns false when transport is missing', async () => {
      emailService.getMailTransporter.mockReturnValueOnce(null);

      await expect(orderService.sendOrderEmail({ items: [], total: 10 }, { session: {} })).resolves.toBe(false);
    });

    it('sends an email when transport is available', async () => {
      const sendMail = jest.fn().mockResolvedValue(undefined);
      emailService.getMailTransporter.mockReturnValueOnce({ sendMail });
      emailService.buildInlineImageAttachment.mockResolvedValueOnce({
        src: 'cid:1',
        attachment: { cid: 'cid-1', filename: 'cat.png' }
      });

      const result = await orderService.sendOrderEmail({
        customerName: 'John Doe',
        customerEmail: 'john@example.com',
        customerPhone: '+380123456789',
        customerAddress: 'Kyiv',
        customerNotes: 'Gift',
        items: [{ name: 'Cat', image: '/img/uploads/cat.png', quantity: 2, lineTotal: 20 }],
        total: 20
      }, { session: { user: { id: 1 } }, headers: {}, get: jest.fn(() => 'shop.test') });

      expect(result).toBe(true);
      expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({
        subject: 'Новый заказ на сумму 20.00 EUR',
        attachments: [{ cid: 'cid-1', filename: 'cat.png' }]
      }));
      expect(htmlUtils.getSiteBaseUrl).toHaveBeenCalled();
    });
  });
});
