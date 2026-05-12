module.exports = {
  '/api/products': {
    get: {
      tags: ['Products'],
      summary: 'Get list of products',
      responses: { '200': { description: 'Array of products', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Product' } } } } } }
    },
    post: {
      tags: ['Products'],
      summary: 'Create product (admin)',
      security: [{ bearerAuth: [] }],
      requestBody: {
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                desc: { type: 'string' },
                price: { type: 'number' },
                image: { type: 'string', format: 'binary' },
                image2: { type: 'string', format: 'binary' },
                categoryId: { type: 'integer' }
              },
              required: ['name', 'price']
            }
          }
        }
      },
      responses: { '201': { description: 'Product created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Product' } } } } }
    }
  },
  '/api/products/{id}': {
    get: {
      tags: ['Products'],
      summary: 'Get product by id',
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
      responses: { '200': { description: 'Product', content: { 'application/json': { schema: { $ref: '#/components/schemas/Product' } } } }, '404': { description: 'Not found' } }
    },
    put: {
      tags: ['Products'],
      summary: 'Update product (admin)',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
      requestBody: { content: { 'multipart/form-data': { schema: { type: 'object' } } } },
      responses: { '200': { description: 'Updated' }, '404': { description: 'Not found' } }
    },
    delete: {
      tags: ['Products'],
      summary: 'Delete product (admin)',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
      responses: { '204': { description: 'Deleted' }, '404': { description: 'Not found' } }
    }
  },
  '/product/{id}': {
    get: {
      tags: ['Products'],
      summary: 'Product page (web)',
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
      responses: { '200': { description: 'HTML product page' } }
    }
  }
};
