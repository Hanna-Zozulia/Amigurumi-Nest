const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerOptions = require('./swaggerOptions');
const tags = require('./tags');

// schemas
const userSchema = require('./schemas/user.schema');
const productSchema = require('./schemas/product.schema');
const cartSchema = require('./schemas/cart.schema');
const orderSchema = require('./schemas/order.schema');
const reviewSchema = require('./schemas/review.schema');

// paths
const authPaths = require('./paths/auth.paths');
const productPaths = require('./paths/product.paths');
const cartPaths = require('./paths/cart.paths');
const orderPaths = require('./paths/order.paths');
const reviewPaths = require('./paths/review.paths');
const adminPaths = require('./paths/admin.paths');
const searchPaths = require('./paths/search.paths');

const router = express.Router();

const spec = Object.assign({}, swaggerOptions, {
  tags,
  paths: Object.assign({}, authPaths, productPaths, cartPaths, orderPaths, reviewPaths, adminPaths, searchPaths),
  components: Object.assign({}, swaggerOptions.components || {}, {
    schemas: Object.assign({}, userSchema, productSchema, cartSchema, orderSchema, reviewSchema),
    securitySchemes: (swaggerOptions.components && swaggerOptions.components.securitySchemes) || {}
  })
});

router.use('/', swaggerUi.serve, swaggerUi.setup(spec));

module.exports = router;
