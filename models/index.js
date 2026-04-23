// models/index.js
const bcrypt = require('bcryptjs');
const { DataTypes } = require('sequelize');
const { createSequelize } = require('../config/database');

const defineUser = require('./User');
const defineProduct = require('./Product');
const defineCart = require('./Cart');
const defineCartItem = require('./CartItem');
const defineOrder = require('./Order');
const defineOrderItem = require('./OrderItem');
const defineReview = require('./Review');

let sequelize = null;

let User = null;
let Product = null;
let Cart = null;
let CartItem = null;
let Order = null;
let OrderItem = null;
let Review = null;
async function initDb() {
    try {
        // Подключение к MySQL
        sequelize = await createSequelize();

        // Инициализация моделей
        User = defineUser(sequelize);
        Product = defineProduct(sequelize);
        Cart = defineCart(sequelize, require('sequelize').DataTypes);
        CartItem = defineCartItem(sequelize, require('sequelize').DataTypes);
        Order = defineOrder(sequelize);
        OrderItem = defineOrderItem(sequelize);
        Review = defineReview(sequelize, require('sequelize').DataTypes);

        // ======================
        // СВЯЗИ (ВАЖНО)
        // ======================

        // Cart -> CartItem
        Cart.hasMany(CartItem, { as: 'items', foreignKey: 'cartId' });
        CartItem.belongsTo(Cart, { foreignKey: 'cartId' });

        // Product -> CartItem
        Product.hasMany(CartItem, { foreignKey: 'productId' });
        CartItem.belongsTo(Product, { foreignKey: 'productId' });

        // Cart -> Order (1 к 1)
        Cart.hasOne(Order, { foreignKey: 'cartId' });
        Order.belongsTo(Cart, { foreignKey: 'cartId' });

        // Order -> OrderItem
        Order.hasMany(OrderItem, { as: 'items', foreignKey: 'orderId' });
        OrderItem.belongsTo(Order, { foreignKey: 'orderId' });

        // Product -> OrderItem
        Product.hasMany(OrderItem, { foreignKey: 'productId' });
        OrderItem.belongsTo(Product, { foreignKey: 'productId' });

        // User -> Review (1 ко многим)
        User.hasMany(Review, { foreignKey: 'userId' });
        Review.belongsTo(User, { foreignKey: 'userId' });

        Product.hasMany(Review, { foreignKey: 'productId' });
        Review.belongsTo(Product, { foreignKey: 'productId' });

        // ======================
        // СИНХРОНИЗАЦИЯ БД
        // ======================
        await sequelize.sync();

        const queryInterface = sequelize.getQueryInterface();

        const reviewsTable = await queryInterface.describeTable('reviews');
        if (!reviewsTable.status) {
            await queryInterface.addColumn('reviews', 'status', {
                type: DataTypes.ENUM('approved', 'pending', 'blocked'),
                allowNull: false,
                defaultValue: 'approved'
            });
        }

        // Приведение схемы orders к актуальному виду для guest checkout
        const ordersTable = await queryInterface.describeTable('orders');

        await queryInterface.changeColumn('orders', 'cartId', {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: true
        });

        if (!ordersTable.customerName) {
            await queryInterface.addColumn('orders', 'customerName', {
                type: DataTypes.STRING(255),
                allowNull: false,
                defaultValue: ''
            });
        }

        if (!ordersTable.customerEmail) {
            await queryInterface.addColumn('orders', 'customerEmail', {
                type: DataTypes.STRING(255),
                allowNull: false,
                defaultValue: ''
            });
        }

        if (!ordersTable.customerPhone) {
            await queryInterface.addColumn('orders', 'customerPhone', {
                type: DataTypes.STRING(255),
                allowNull: false,
                defaultValue: ''
            });
        }

        if (!ordersTable.customerNotes) {
            await queryInterface.addColumn('orders', 'customerNotes', {
                type: DataTypes.TEXT,
                allowNull: true
            });
        }

        // ======================
        // ДЕФОЛТНЫЕ ЮЗЕРЫ
        // ======================
        const usersCount = await User.count();

        if (usersCount === 0) {
            const adminPass = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
            const userPass = await bcrypt.hash(process.env.USER_PASSWORD, 10);

            await User.bulkCreate([
                {
                    name: 'Administrator',
                    email: process.env.ADMIN_EMAIL,
                    password: adminPass,
                    role: 'admin'
                },
                {
                    name: 'Customer',
                    email: process.env.USER_EMAIL,
                    password: userPass,
                    role: 'user'
                }
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
    if (sequelize && User && Product && Cart && CartItem && Order && OrderItem && Review) {
        return {
            sequelize,
            User,
            Product,
            Cart,
            CartItem,
            Order,
            OrderItem,
            Review
        };
    }
    return null;
}

module.exports = { initDb, getModels };