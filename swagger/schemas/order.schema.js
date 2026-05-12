module.exports = {
  OrderItem: {
    type: 'object',
    properties: {
      productId: { type: 'integer' },
      quantity: { type: 'integer' },
      price: { type: 'number' }
    },
    required: ['productId', 'quantity', 'price']
  },
  Order: {
    type: 'object',
    properties: {
      id: { type: 'integer' },
      userId: { type: 'integer' },
      status: { type: 'string' },
      total: { type: 'number' },
      items: { type: 'array', items: { $ref: '#/components/schemas/OrderItem' } },
      createdAt: { type: 'string', format: 'date-time' }
    }
  }
};
