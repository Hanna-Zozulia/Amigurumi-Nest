const { mockModels } = require('../../helpers/dbMock');
const { createMockRequest, createMockResponse } = require('../../helpers/testHelpers');

jest.mock('../../../models', () => ({
  getModels: jest.fn(() => require('../../helpers/dbMock').mockModels)
}));

jest.mock('../../../services/cacheService', () => ({
  invalidateReviewsCache: jest.fn().mockResolvedValue(undefined)
}));

jest.mock('../../../services/profanityFilter', () => ({
  checkProfanity: jest.fn((value) => ({
    flagged: String(value).includes('badword'),
    reason: String(value).includes('badword') ? 'profanity' : null
  }))
}));

const adminCommentsController = require('../../../controllers/adminCommentsController');
const orderAdminController = require('../../../controllers/orderAdminController');

describe('Admin flows', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockModels.Review.findAll.mockReset();
    mockModels.Review.findByPk.mockReset();
    mockModels.Review.count.mockReset();
    mockModels.Product.findAll.mockReset();
    mockModels.Order.findAll.mockReset();
    mockModels.Order.findByPk.mockReset();
  });

  describe('adminCommentsController', () => {
    it('renders filtered comments page', async () => {
      mockModels.Review.findAll.mockResolvedValueOnce([
        {
          id: 1,
          text: 'Hello',
          status: 'blocked',
          adminReply: 'thanks',
          blockedReason: 'profanity',
          createdAt: new Date('2024-01-01T10:00:00Z'),
          deletedAt: null,
          userId: 5,
          User: { id: 5, name: 'User', email: 'user@test.com' },
          Product: { id: 9, name: 'Cat Toy' }
        }
      ]);
      mockModels.Product.findAll.mockResolvedValueOnce([{ id: 9, name: 'Cat Toy' }]);
      mockModels.Review.count
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(4);
      mockModels.Review.count.mockResolvedValueOnce(5);

      const req = createMockRequest({
        session: { user: { id: 2, role: 'admin' } },
        query: { status: 'blocked', sort: 'oldest', productId: '9', q: 'hello' }
      });
      const res = createMockResponse();

      await adminCommentsController.listCommentsPage(req, res);

      expect(res.render).toHaveBeenCalledWith('admin_comments', expect.objectContaining({
        filters: {
          status: 'blocked',
          sort: 'oldest',
          productId: '9',
          q: 'hello'
        },
        comments: [expect.objectContaining({
          id: 1,
          status: 'blocked',
          statusLabel: 'Заблокирован',
          hasReply: true,
          author: expect.objectContaining({ name: 'User' }),
          product: expect.objectContaining({ name: 'Cat Toy' })
        })]
      }));
    });

    it('handles comment actions and edge cases', async () => {
      mockModels.Review.findByPk
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 2,
          productId: 9,
          update: jest.fn().mockResolvedValue({})
        })
        .mockResolvedValueOnce({
          id: 3,
          productId: 9,
          update: jest.fn().mockResolvedValue({})
        })
        .mockResolvedValueOnce({
          id: 4,
          productId: 9,
          destroy: jest.fn().mockResolvedValue({})
        })
        .mockResolvedValueOnce({
          id: 5,
          productId: 9,
          deletedAt: null,
          restore: jest.fn(),
          update: jest.fn()
        })
        .mockResolvedValueOnce({
          id: 6,
          productId: 9,
          deletedAt: new Date(),
          restore: jest.fn().mockResolvedValue({})
        });

      const invalidReq = createMockRequest({
        session: { user: { id: 2, role: 'admin' } },
        params: { id: 'x' },
        body: { adminReply: 'Hi' }
      });
      const invalidRes = createMockResponse();
      await adminCommentsController.replyComment(invalidReq, invalidRes);
      expect(invalidRes.status).toHaveBeenCalledWith(400);

      const missingReq = createMockRequest({
        session: { user: { id: 2, role: 'admin' } },
        params: { id: '1' },
        body: { adminReply: 'Hi' }
      });
      const missingRes = createMockResponse();
      await adminCommentsController.replyComment(missingReq, missingRes);
      expect(missingRes.status).toHaveBeenCalledWith(404);

      const replyReq = createMockRequest({
        session: { user: { id: 2, role: 'admin' } },
        params: { id: '2' },
        body: { adminReply: 'Thanks', returnTo: '/admin/comments?status=blocked' }
      });
      const replyRes = createMockResponse();
      await adminCommentsController.replyComment(replyReq, replyRes);
      expect(replyRes.redirect).toHaveBeenCalledWith('/admin/comments?status=blocked');

      const approveReq = createMockRequest({
        session: { user: { id: 2, role: 'admin' } },
        params: { id: '3' },
        body: { returnTo: '/admin/comments' }
      });
      const approveRes = createMockResponse();
      await adminCommentsController.approveComment(approveReq, approveRes);
      expect(approveRes.redirect).toHaveBeenCalledWith('/admin/comments');

      const deleteReq = createMockRequest({
        session: { user: { id: 2, role: 'admin' } },
        params: { id: '4' },
        body: {}
      });
      const deleteRes = createMockResponse();
      await adminCommentsController.deleteComment(deleteReq, deleteRes);
      expect(deleteRes.redirect).toHaveBeenCalledWith('/admin/comments');

      const restoreReq = createMockRequest({
        session: { user: { id: 2, role: 'admin' } },
        params: { id: '5' },
        body: {}
      });
      const restoreRes = createMockResponse();
      await adminCommentsController.restoreComment(restoreReq, restoreRes);
      expect(restoreRes.redirect).toHaveBeenCalledWith('/admin/comments');

      const restoredReq = createMockRequest({
        session: { user: { id: 2, role: 'admin' } },
        params: { id: '6' },
        body: {}
      });
      const restoredRes = createMockResponse();
      await adminCommentsController.restoreComment(restoredReq, restoredRes);
      expect(restoredRes.redirect).toHaveBeenCalledWith('/admin/comments');
    });
  });

  describe('orderAdminController', () => {
    it('renders order pages and api responses', async () => {
      const order = {
        id: 10,
        userId: 1,
        customerName: 'John Doe',
        customerEmail: 'john@test.com',
        customerPhone: '+380123',
        customerAddress: 'Kyiv',
        customerNotes: 'Gift',
        total: 50,
        status: 'unprocessed',
        createdAt: new Date('2024-01-01T10:00:00Z'),
        items: [
          {
            id: 1,
            productId: 2,
            quantity: 2,
            price: 25,
            Product: { name: 'Cat Toy', image: '/img/cat.png' }
          }
        ]
      };

      mockModels.Order.findAll.mockResolvedValue([order]);
      mockModels.Order.findByPk.mockResolvedValue(order);

      const listReq = createMockRequest({ session: { user: { id: 2, role: 'admin' } } });
      const listRes = createMockResponse();
      await orderAdminController.listOrdersPage(listReq, listRes);
      expect(listRes.render).toHaveBeenCalledWith('admin_orders', expect.objectContaining({
        orders: [expect.objectContaining({
          id: 10,
          statusLabel: 'Не обработан'
        })]
      }));

      const detailsReq = createMockRequest({ session: { user: { id: 2, role: 'admin' } }, params: { id: '10' } });
      const detailsRes = createMockResponse();
      await orderAdminController.orderDetailsPage(detailsReq, detailsRes);
      expect(detailsRes.render).toHaveBeenCalledWith('admin_order_details', expect.objectContaining({
        nextStatus: 'processing'
      }));

      const apiReq = createMockRequest({ session: { user: { id: 2, role: 'admin' } } });
      const apiRes = createMockResponse();
      await orderAdminController.listOrdersApi(apiReq, apiRes);
      expect(apiRes.json).toHaveBeenCalledWith(expect.any(Array));

      const detailsApiReq = createMockRequest({ session: { user: { id: 2, role: 'admin' } }, params: { id: '10' } });
      const detailsApiRes = createMockResponse();
      await orderAdminController.orderDetailsApi(detailsApiReq, detailsApiRes);
      expect(detailsApiRes.json).toHaveBeenCalledWith(expect.objectContaining({
        id: 10,
        statusLabel: 'Не обработан'
      }));
    });

    it('handles invalid and missing order ids', async () => {
      const invalidReq = createMockRequest({ session: { user: { id: 2, role: 'admin' } }, params: { id: 'x' } });
      const invalidRes = createMockResponse();
      await orderAdminController.orderDetailsPage(invalidReq, invalidRes);
      expect(invalidRes.status).toHaveBeenCalledWith(400);

      const missingReq = createMockRequest({ session: { user: { id: 2, role: 'admin' } }, params: { id: '10' } });
      mockModels.Order.findByPk.mockResolvedValueOnce(null);
      const missingRes = createMockResponse();
      await orderAdminController.orderDetailsPage(missingReq, missingRes);
      expect(missingRes.status).toHaveBeenCalledWith(404);

      const updateReq = createMockRequest({ session: { user: { id: 2, role: 'admin' } }, params: { id: '10' }, body: { status: 'processing' } });
      const updateRes = createMockResponse();
      mockModels.Order.findByPk.mockResolvedValueOnce({ id: 10, status: 'unprocessed', update: jest.fn().mockResolvedValue({}) });
      await orderAdminController.updateOrderStatus(updateReq, updateRes);
      expect(updateRes.json).toHaveBeenCalledWith(expect.objectContaining({ ok: true }));

      const pageReq = createMockRequest({ session: { user: { id: 2, role: 'admin' } }, params: { id: '10' }, body: { redirectTo: 'list' } });
      const pageRes = createMockResponse();
      mockModels.Order.findByPk.mockResolvedValueOnce({ id: 10, status: 'unprocessed', update: jest.fn().mockResolvedValue({}) });
      await orderAdminController.updateOrderStatusPage(pageReq, pageRes);
      expect(pageRes.redirect).toHaveBeenCalledWith('/admin/orders');

      const apiInvalidReq = createMockRequest({ session: { user: { id: 2, role: 'admin' } }, params: { id: 'x' } });
      const apiInvalidRes = createMockResponse();
      await orderAdminController.orderDetailsApi(apiInvalidReq, apiInvalidRes);
      expect(apiInvalidRes.status).toHaveBeenCalledWith(400);
    });
  });
});
