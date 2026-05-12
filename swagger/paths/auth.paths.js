module.exports = {
  '/login': {
    get: {
      tags: ['Auth'],
      summary: 'Login form',
      responses: { '200': { description: 'Login page (HTML form)' } }
    },
    post: {
      tags: ['Auth'],
      summary: 'Perform login',
      requestBody: {
        content: {
          'application/x-www-form-urlencoded': {
            schema: {
              type: 'object',
              properties: { email: { type: 'string' }, password: { type: 'string' } },
              required: ['email', 'password']
            }
          }
        }
      },
      responses: { '302': { description: 'Redirect on success' }, '401': { description: 'Invalid credentials' } }
    }
  },
  '/logout': {
    post: {
      tags: ['Auth'],
      summary: 'Logout user (end session)',
      responses: { '200': { description: 'Logged out' } }
    }
  },
  '/register': {
    get: { tags: ['Auth'], summary: 'Registration form', responses: { '200': { description: 'Register page' } } },
    post: {
      tags: ['Auth'],
      summary: 'Register new user',
      requestBody: {
        content: {
          'application/x-www-form-urlencoded': {
            schema: { type: 'object', properties: { email: { type: 'string' }, password: { type: 'string' } }, required: ['email', 'password'] }
          }
        }
      },
      responses: { '201': { description: 'User created' }, '400': { description: 'Validation error' } }
    }
  },
  '/forgot-password': {
    get: { tags: ['Auth'], summary: 'Forgot password form', responses: { '200': { description: 'Forgot password page' } } },
    post: {
      tags: ['Auth'],
      summary: 'Send password reset email',
      requestBody: { content: { 'application/x-www-form-urlencoded': { schema: { type: 'object', properties: { email: { type: 'string' } }, required: ['email'] } } } },
      responses: { '200': { description: 'Email sent' }, '404': { description: 'Email not found' } }
    }
  },
  '/reset-password/{token}': {
    get: {
      tags: ['Auth'],
      summary: 'Reset password form',
      parameters: [{ name: 'token', in: 'path', required: true, schema: { type: 'string' } }],
      responses: { '200': { description: 'Reset form' }, '400': { description: 'Invalid token' } }
    },
    post: {
      tags: ['Auth'],
      summary: 'Perform password reset',
      parameters: [{ name: 'token', in: 'path', required: true, schema: { type: 'string' } }],
      requestBody: { content: { 'application/x-www-form-urlencoded': { schema: { type: 'object', properties: { password: { type: 'string' } }, required: ['password'] } } } },
      responses: { '200': { description: 'Password reset successful' }, '400': { description: 'Invalid token or input' } }
    }
  }
};
