const { mockModels } = require('../../helpers/dbMock');
const { createMockRequest, createMockResponse } = require('../../helpers/testHelpers');

jest.mock('../../../models', () => ({
  getModels: jest.fn(() => require('../../helpers/dbMock').mockModels)
}));

const adminDashboardController = require('../../../controllers/adminDashboardController');
const adminProductsController = require('../../../controllers/adminProductsController');
const userAdminController = require('../../../controllers/userAdminController');

describe('Admin panel controllers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockModels.Order.count.mockReset();
    mockModels.User.count.mockReset();
    mockModels.Product.count.mockReset();
    mockModels.Category.findAll.mockReset();
    mockModels.Order.findAll.mockReset();
    mockModels.User.findAll.mockReset();
    mockModels.User.findByPk.mockReset();
    mockModels.Product.findAll.mockReset();
  });

  describe('adminDashboard', () => {
    it('renders dashboard stats and recent orders', async () => {
      mockModels.Order.count.mockResolvedValue(3);
      mockModels.User.count.mockResolvedValue(4);
      mockModels.Product.count.mockResolvedValue(5);
      // Mock implementation for `Order.findAll` used to simulate multiple
      // query shapes (raw sums, grouped counts, and recent order rows).
      mockModels.Order.findAll.mockImplementation(async (options = {}) => {
        if (options.raw) {
          return [{ totalSum: '123.45' }];
        }

        if (Array.isArray(options.group)) {
          return [
            { status: 'unprocessed', count: '2' },
            { status: 'shipped', count: '1' },
            { status: 'unknown', count: '9' }
          ];
        }

        return [
          {
            id: 7,
            customerName: 'John Doe',
            status: 'processing',
            total: '40.50'
          }
        ];
      });
      // Mock implementation for `User.findAll` to simulate grouped status counts
      mockModels.User.findAll.mockImplementation(async () => [
        { status: 'active', count: '3' },
        { status: 'inactive', count: '1' },
        { status: 'other', count: '99' }
      ]);

      const req = createMockRequest({ session: { user: { id: 2, role: 'admin' } } });
      const res = createMockResponse();

      await adminDashboardController.adminDashboard(req, res);

      expect(res.render).toHaveBeenCalledWith('admin_dashboard', expect.objectContaining({
        stats: expect.objectContaining({
          ordersCount: 3,
          usersCount: 4,
          productsCount: 5,
          totalOrdersSum: 123.45
        }),
        recentOrders: [
          expect.objectContaining({
            id: 7,
            customerName: 'John Doe',
            status: 'processing',
            statusLabel: 'В работе',
            total: 40.5
          })
        ]
      }));
    });

    it('returns 500 on error', async () => {
      mockModels.Order.count.mockRejectedValueOnce(new Error('boom'));

      const req = createMockRequest({ session: { user: { id: 2, role: 'admin' } } });
      const res = createMockResponse();

      await adminDashboardController.adminDashboard(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('adminProductsController', () => {
    it('renders product admin list', async () => {
      mockModels.Category.findAll.mockResolvedValueOnce([
        { id: 1, name: 'Animals' }
      ]);
      mockModels.Product.findAll.mockResolvedValueOnce([
        {
          id: 1,
          name: 'Cat',
          category: { name: 'Animals' },
          price: '12.5',
          image: '/img/uploads/cat.png',
          createdAt: new Date('2024-01-01T00:00:00Z')
        }
      ]);

      const req = createMockRequest({ session: { user: { id: 2, role: 'admin' } } });
      const res = createMockResponse();

      await adminProductsController.listProductsAdmin(req, res);

      expect(res.render).toHaveBeenCalledWith('admin_products', expect.objectContaining({
        categories: [expect.objectContaining({ id: 1, name: 'Animals' })],
        products: [expect.objectContaining({
          id: 1,
          name: 'Cat',
          price: 12.5,
          categoryName: 'Animals'
        })]
      }));
    });

    it('filters products by search and category', async () => {
      mockModels.Category.findAll.mockResolvedValueOnce([
        { id: 1, name: 'Animals' },
        { id: 2, name: 'Mini' }
      ]);
      mockModels.Product.findAll.mockResolvedValueOnce([]);

      const req = createMockRequest({
        session: { user: { id: 2, role: 'admin' } },
        query: { q: 'cat', categoryId: '1' }
      });
      const res = createMockResponse();

      await adminProductsController.listProductsAdmin(req, res);

      expect(mockModels.Product.findAll).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          name: expect.any(Object),
          categoryId: '1'
        })
      }));
      expect(res.render).toHaveBeenCalledWith('admin_products', expect.objectContaining({
        searchTerm: 'cat',
        selectedCategoryId: '1'
      }));
    });
  });

  describe('userAdminController', () => {
    it('renders inactive users page', async () => {
      mockModels.User.findAll.mockResolvedValueOnce([
        {
          get: jest.fn(() => ({
            id: 1,
            name: 'User',
            email: 'user@test.com',
            status: 'inactive',
            lastLoginAt: new Date('2024-01-01T00:00:00Z'),
            createdAt: new Date('2024-01-02T00:00:00Z')
          }))
        }
      ]);

      const req = createMockRequest({
        session: { user: { id: 2, role: 'admin' } },
        query: {}
      });
      const res = createMockResponse();

      await userAdminController.showInactiveUsers(req, res);

      expect(res.render).toHaveBeenCalledWith('inactive_users', expect.objectContaining({
        users: [expect.objectContaining({
          id: 1,
          name: 'User',
          email: 'user@test.com'
        })],
        allowedStatuses: ['active', 'inactive', 'suspended']
      }));
    });

    it('updates user status and handles invalid requests', async () => {
      const user = { role: 'user', update: jest.fn().mockResolvedValue({}) };
      mockModels.User.findByPk.mockResolvedValueOnce(user);

      const successReq = createMockRequest({
        session: { user: { id: 2, role: 'admin' } },
        params: { id: '1' },
        body: { status: 'inactive' }
      });
      const successRes = createMockResponse();

      await userAdminController.updateUserStatus(successReq, successRes);

      expect(user.update).toHaveBeenCalledWith({ status: 'inactive' });
      expect(successRes.redirect).toHaveBeenCalledWith('/admin/users?updated=1');

      const invalidReq = createMockRequest({
        session: { user: { id: 2, role: 'admin' } },
        params: { id: '1' },
        body: { status: 'unknown' }
      });
      const invalidRes = createMockResponse();

      await userAdminController.updateUserStatus(invalidReq, invalidRes);

      expect(invalidRes.redirect).toHaveBeenCalledWith('/admin/users?error=1');
    });
  });

  describe('Additional Coverage - Admin Error Paths', () => {
    it('should handle dashboard error gracefully', async () => {
      mockModels.Order.count.mockRejectedValue(new Error('DB Error'));

      const req = createMockRequest({
        session: { user: { id: 2, role: 'admin' } }
      });
      const res = createMockResponse();

      await adminDashboardController.adminDashboard(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('should handle missing products', async () => {
      mockModels.Product.findAll.mockResolvedValue([]);

      const req = createMockRequest({
        session: { user: { id: 2, role: 'admin' } }
      });
      const res = createMockResponse();

      await adminProductsController.listProductsAdmin(req, res);

      expect(res.render).toHaveBeenCalledWith('admin_products', expect.objectContaining({
        products: []
      }));
    });

    it('should handle user not found in update', async () => {
      mockModels.User.findByPk.mockResolvedValue(null);

      const req = createMockRequest({
        session: { user: { id: 2, role: 'admin' } },
        params: { id: '999' },
        body: { status: 'inactive' }
      });
      const res = createMockResponse();

      await userAdminController.updateUserStatus(req, res);

      expect(res.redirect).toHaveBeenCalledWith('/admin/users?error=1');
    });

    it('should handle invalid status value', async () => {
      const user = { role: 'user', update: jest.fn() };
      mockModels.User.findByPk.mockResolvedValue(user);

      const req = createMockRequest({
        session: { user: { id: 2, role: 'admin' } },
        params: { id: '1' },
        body: { status: 'invalid_status' }
      });
      const res = createMockResponse();

      await userAdminController.updateUserStatus(req, res);

      expect(user.update).not.toHaveBeenCalled();
      expect(res.redirect).toHaveBeenCalledWith('/admin/users?error=1');
    });

    it('should reject when user update fails', async () => {
      const user = { role: 'user', update: jest.fn().mockRejectedValue(new Error('Update failed')) };
      mockModels.User.findByPk.mockResolvedValue(user);

      const req = createMockRequest({
        session: { user: { id: 2, role: 'admin' } },
        params: { id: '1' },
        body: { status: 'inactive' }
      });
      const res = createMockResponse();

      await expect(userAdminController.updateUserStatus(req, res)).rejects.toThrow('Update failed');
    });
  });
});
