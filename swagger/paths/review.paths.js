module.exports = {
  '/review/add': {
    post: {
      tags: ['Reviews'],
      summary: 'Create review (rate-limited, profanity filtered)',
      requestBody: { content: { 'application/x-www-form-urlencoded': { schema: { type: 'object', properties: { productId: { type: 'integer' }, text: { type: 'string' } }, required: ['productId', 'text'] } } } },
      responses: { '201': { description: 'Review created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Review' } } } } }
    }
  },
  '/review/edit/{id}': {
    get: { tags: ['Reviews'], summary: 'Edit review form', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }], responses: { '200': { description: 'Edit page' } } },
    post: { tags: ['Reviews'], summary: 'Update review', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }], requestBody: { content: { 'application/x-www-form-urlencoded': { schema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] } } } }, responses: { '200': { description: 'Updated' } } }
  },
  '/review/delete/{id}': {
    post: { tags: ['Reviews'], summary: 'Delete review', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }], responses: { '200': { description: 'Deleted' } } }
  },
  '/review/reply/{id}': {
    post: { tags: ['Reviews'], summary: 'Admin reply to review', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }], requestBody: { content: { 'application/x-www-form-urlencoded': { schema: { type: 'object', properties: { reply: { type: 'string' } }, required: ['reply'] } } } }, responses: { '200': { description: 'Reply saved' } } }
  },
  '/review/reply/delete/{id}': {
    post: { tags: ['Reviews'], summary: 'Admin delete reply', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }], responses: { '200': { description: 'Reply deleted' } } }
  }
};
