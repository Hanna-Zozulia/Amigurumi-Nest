module.exports = {
  openapi: '3.0.0',
  info: {
    title: 'Amigurumi Nest API',
    version: '1.0.0',
    description: 'Swagger (OpenAPI 3.0) documentation for Amigurumi Nest Node.js application'
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Local server'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    }
  }
};
