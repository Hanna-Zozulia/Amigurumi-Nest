module.exports = {
  CartItem: {
    type: 'object',
    properties: {
      productId: { type: 'integer' },
      quantity: { type: 'integer' },
      price: { type: 'number' }
    },
    required: ['productId', 'quantity']
  },
  Cart: {
    type: 'object',
    properties: {
      id: { type: 'integer' },
      userId: { type: ['integer', 'null'] },
      items: { type: 'array', items: { $ref: '#/components/schemas/CartItem' } }
    }
  }
};
