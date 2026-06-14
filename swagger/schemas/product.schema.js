module.exports = {
  Product: {
    type: 'object',
    properties: {
      id: { type: 'integer' },
      name: { type: 'string' },
      desc: { type: 'string' },
      price: { type: 'number', format: 'float' },
      image: { type: 'string' },
      image2: { type: 'string' },
      categoryId: { type: 'integer' },
      isNew: { type: 'boolean' },
      inStock: { type: 'boolean' },
      views: { type: 'integer' }
    },
    required: ['id', 'name', 'price']
  }
};
