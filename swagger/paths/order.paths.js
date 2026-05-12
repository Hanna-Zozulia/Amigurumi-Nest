module.exports = {
  '/order': {
    post: {
      tags: ['Orders'],
      summary: 'Create order (checkout)',
      requestBody: { content: { 'application/x-www-form-urlencoded': { schema: { type: 'object', properties: { address: { type: 'string' }, paymentMethod: { type: 'string' } } } } } },
      responses: { '201': { description: 'Order created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Order' } } } } }
    }
  },
  '/checkout': {
    get: { tags: ['Orders'], summary: 'Checkout page (web)', responses: { '200': { description: 'Checkout form' } } }
  },
  '/api/orders': {
    get: {
      tags: ['Orders'],
      summary: 'Admin: list orders',
      security: [{ bearerAuth: [] }],
      responses: { '200': { description: 'Orders array', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Order' } } } } } }
    }
  },
  '/api/orders/{id}': {
    get: {
      tags: ['Orders'],
      summary: 'Admin: order details',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
      responses: { '200': { description: 'Order', content: { 'application/json': { schema: { $ref: '#/components/schemas/Order' } } } } }
    },
    patch: {
      tags: ['Orders'],
      summary: 'Admin: change order status',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
      requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string' } }, required: ['status'] } } } },
      responses: { '200': { description: 'Status updated' } }
    }
  }
};
