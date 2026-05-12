module.exports = {
  Review: {
    type: 'object',
    properties: {
      id: { type: 'integer' },
      userId: { type: 'integer' },
      productId: { type: 'integer' },
      text: { type: 'string' },
      status: { type: 'string', description: 'pending|approved|hidden' },
      adminReply: { type: 'string' },
      createdAt: { type: 'string', format: 'date-time' }
    },
    required: ['id', 'userId', 'productId', 'text']
  }
};
