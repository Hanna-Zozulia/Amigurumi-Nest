/**
 * Example users used in tests. Contains a regular user and an admin user.
 */
const testUsers = {
  regularUser: {
    id: 1,
    name: 'John Doe',
    email: 'john@example.com',
    password: 'HashedPassword123',
    role: 'user',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  adminUser: {
    id: 2,
    name: 'Admin User',
    email: 'admin@example.com',
    password: 'HashedPassword456',
    role: 'admin',
    createdAt: new Date(),
    updatedAt: new Date()
  }
};

/**
 * Example product fixtures. Each product contains minimal fields the app
 * expects (id, name, desc, price, images, categoryId, views, isNew).
 */
const testProducts = {
  product1: {
    id: 1,
    name: 'Амигуруми Кот',
    desc: 'Красивая вязаная кошечка',
    price: 25.99,
    image: '/img/uploads/cat1.jpg',
    image2: '/img/uploads/cat2.jpg',
    categoryId: 1,
    views: 100,
    isNew: false,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  product2: {
    id: 2,
    name: 'Амигуруми Собака',
    desc: 'Милая вязаная собачка',
    price: 29.99,
    image: '/img/uploads/dog1.jpg',
    image2: '/img/uploads/dog2.jpg',
    categoryId: 1,
    views: 50,
    isNew: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
};

/**
 * Example cart fixtures. Represent user carts with items arrays used in
 * cart/order related tests.
 */
const testCarts = {
  cart1: {
    id: 1,
    userId: 1,
    items: [],
    createdAt: new Date(),
    updatedAt: new Date()
  }
};

/**
 * Example review fixtures. Used to test review creation, moderation and
 * admin reply flows.
 */
const testReviews = {
  review1: {
    id: 1,
    text: 'Отличный товар!',
    productId: 1,
    userId: 1,
    status: 'approved',
    blockedReason: null,
    adminReply: null,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date()
  }
};

/**
 * Example order fixtures. Represent a completed order payload used in
 * checkout and order-related tests.
 */
const testOrders = {
  order1: {
    id: 1,
    cartId: 1,
    userId: 1,
    customerName: 'John Doe',
    customerEmail: 'john@example.com',
    customerPhone: '+380123456789',
    customerAddress: 'Kyiv, Ukraine',
    customerNotes: 'Gift wrap please',
    total: 55.98,
    status: 'unprocessed',
    createdAt: new Date(),
    updatedAt: new Date()
  }
};

module.exports = {
  testUsers,
  testProducts,
  testCarts,
  testReviews,
  testOrders
};
