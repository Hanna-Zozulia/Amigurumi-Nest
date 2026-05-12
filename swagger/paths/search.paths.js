module.exports = {
  '/api/search': {
    get: {
      tags: ['Search'],
      summary: 'Search products',
      parameters: [{ name: 'q', in: 'query', schema: { type: 'string' }, description: 'Search query (min 2 chars)' }],
      responses: { '200': { description: 'Search results', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Product' } } } } } }
    }
  }
};
