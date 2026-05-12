module.exports = {
  User: {
    type: 'object',
    properties: {
      id: { type: 'integer', format: 'int64' },
      email: { type: 'string', format: 'email' },
      password: { type: 'string', description: 'hashed password' },
      role: { type: 'string', enum: ['user', 'admin'] },
      createdAt: { type: 'string', format: 'date-time' }
    },
    required: ['id', 'email', 'role', 'createdAt']
  }
};
