// models/index.js
const bcrypt = require('bcryptjs');
const { createSequelize } = require('../config/database');

const defineUser = require('./User');
const defineProduct = require('./Product');
const defineCart = require('./cart');
const defineCartItem = require('./cartItem');
const defineOrder = require('./order');

let sequelize = null;
let User = null;
let Product = null;
let Cart = null;
let CartItem = null;
let Order = null;

async function initDb() {
    try {
        sequelize = await createSequelize();

        User = defineUser(sequelize);
        Product = defineProduct(sequelize);
        Cart = defineCart(sequelize, require('sequelize').DataTypes);
        CartItem = defineCartItem(sequelize, require('sequelize').DataTypes);
        Order = defineOrder(sequelize);

        // Связи
        Cart.hasMany(CartItem, { as: 'items', foreignKey: 'cartId' });
        CartItem.belongsTo(Cart, { foreignKey: 'cartId' });
        CartItem.belongsTo(Product, { foreignKey: 'productId' });

        Order.belongsTo(Cart, { foreignKey: 'cartId' });
        Cart.hasOne(Order, { foreignKey: 'cartId' });

        await sequelize.sync({ alter: true });

        const usersCount = await User.count();
        if (usersCount === 0) {
            const adminPass = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
            const userPass = await bcrypt.hash(process.env.USER_PASSWORD, 10);

            await User.bulkCreate([
                { name: 'Administrator', email: process.env.ADMIN_EMAIL, password: adminPass, rule: 'admin' },
                { name: 'Customer', email: process.env.USER_EMAIL, password: userPass, rule: 'user' }
            ]);
            console.log('Default users created');
        }

        console.log('MySQL database initialized successfully');
    } catch (err) {
        console.error('Failed to initialize MySQL:', err.message);
        process.exit(1);
    }
}

function getModels() {
    if (sequelize && User && Product) {
        return { sequelize, User, Product, Cart, CartItem, Order };
    }
    return null;
}

module.exports = { initDb, getModels };