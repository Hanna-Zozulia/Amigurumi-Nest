/**
 * Create a lightweight mock of a Sequelize-like model exposing commonly used
 * methods (`findByPk`, `findOne`, `findAll`, `create`, `update`, etc.) mocked
 * with `jest.fn()` so unit tests can stub behaviors per-test.
 */
const createMockModel = (name) => ({
  findByPk: jest.fn(),
  findOne: jest.fn(),
  findAll: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  destroy: jest.fn(),
  increment: jest.fn(),
  bulkCreate: jest.fn(),
  count: jest.fn(),
  sync: jest.fn(async () => Promise.resolve()),
});

const mockModels = {
  User: createMockModel('User'),
  Product: createMockModel('Product'),
  Cart: createMockModel('Cart'),
  CartItem: createMockModel('CartItem'),
  Order: createMockModel('Order'),
  OrderItem: createMockModel('OrderItem'),
  Review: createMockModel('Review'),
  Category: createMockModel('Category'),
};

// Mock getModels function
const mockGetModels = jest.fn(() => mockModels);

module.exports = {
  mockModels,
  mockGetModels,
  createMockModel
};
