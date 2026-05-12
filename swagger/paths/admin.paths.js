module.exports = {
  '/admin': {
    get: {
      tags: ['Admin'],
      summary: 'Admin dashboard (stats)',
      security: [{ bearerAuth: [] }],
      responses: { '200': { description: 'Admin dashboard page or data' } }
    }
  },
  '/admin/users': {
    get: {
      tags: ['Admin'],
      summary: 'List users (admin)',
      security: [{ bearerAuth: [] }],
      responses: { '200': { description: 'Array of users', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/User' } } } } } }
    }
  },
  '/admin/users/{id}/status': {
    post: {
      tags: ['Admin'],
      summary: 'Change user status (admin)',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
      requestBody: { content: { 'application/x-www-form-urlencoded': { schema: { type: 'object', properties: { status: { type: 'string' } }, required: ['status'] } } } },
      responses: { '200': { description: 'Status updated' } }
    }
  }
};
