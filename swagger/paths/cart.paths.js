module.exports = {
  '/api/cart': {
    get: {
      tags: ['Cart'],
      summary: 'Get cart for authenticated user',
      security: [{ bearerAuth: [] }],
      responses: { '200': { description: 'Cart object', content: { 'application/json': { schema: { $ref: '#/components/schemas/Cart' } } } } }
    }
  },
  '/api/cart/add': {
    post: {
      tags: ['Cart'],
      summary: 'Add item to cart (auth)',
      security: [{ bearerAuth: [] }],
      requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { productId: { type: 'integer' }, quantity: { type: 'integer' } }, required: ['productId'] } } } },
      responses: { '200': { description: 'Item added', content: { 'application/json': { schema: { $ref: '#/components/schemas/Cart' } } } } }
    }
  },
  '/api/cart/remove': {
    post: {
      tags: ['Cart'],
      summary: 'Remove one item from cart (auth)',
      security: [{ bearerAuth: [] }],
      requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { productId: { type: 'integer' } }, required: ['productId'] } } } },
      responses: { '200': { description: 'Item removed' } }
    }
  },
  '/api/cart/clear': {
    post: {
      tags: ['Cart'],
      summary: 'Clear cart (auth)',
      security: [{ bearerAuth: [] }],
      responses: { '200': { description: 'Cart cleared' } }
    }
  },
  '/cart': {
    get: { tags: ['Cart'], summary: 'Web: show cart (session/guest supported)', responses: { '200': { description: 'HTML cart page' } } },
    post: { tags: ['Cart'], summary: 'Web: add to cart (session)', responses: { '302': { description: 'Redirect' } } }
  },
  '/cart/remove': { post: { tags: ['Cart'], summary: 'Web: remove item', responses: { '302': { description: 'Redirect' } } } },
  '/cart/clear': { post: { tags: ['Cart'], summary: 'Web: clear cart', responses: { '302': { description: 'Redirect' } } } }
};
