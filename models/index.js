// models/index.js
const bcrypt = require('bcryptjs');
const { DataTypes } = require('sequelize');
const { createSequelize } = require('../config/database');

const defineUser = require('./User');
const defineProduct = require('./Product');
const defineCategory = require('./Category');
const defineCart = require('./Cart');
const defineCartItem = require('./CartItem');
const defineOrder = require('./Order');
const defineOrderItem = require('./OrderItem');
const defineReview = require('./Review');

let sequelize = null;

let User = null;
let Product = null;
let Category = null;
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
        Category = defineCategory(sequelize, DataTypes);
        Cart = defineCart(sequelize, DataTypes);
        CartItem = defineCartItem(sequelize, DataTypes);
        Order = defineOrder(sequelize);
        OrderItem = defineOrderItem(sequelize);
        Review = defineReview(sequelize, DataTypes);

        // ======================
        // СВЯЗИ (ВАЖНО)
        // ======================

        // Cart -> CartItem
        Cart.hasMany(CartItem, { as: 'items', foreignKey: 'cartId' });
        CartItem.belongsTo(Cart, { foreignKey: 'cartId' });

        // Product -> CartItem
        Product.hasMany(CartItem, { foreignKey: 'productId' });
        CartItem.belongsTo(Product, { foreignKey: 'productId' });

        // Category -> Product
        Category.hasMany(Product, { foreignKey: 'categoryId', as: 'products' });
        Product.belongsTo(Category, { foreignKey: 'categoryId', as: 'category' });

        // Cart -> Order (1 к 1)
        Cart.hasOne(Order, { foreignKey: 'cartId' });
        Order.belongsTo(Cart, { foreignKey: 'cartId' });

        // User -> Order (1 ко многим)
        User.hasMany(Order, { foreignKey: 'userId' });
        Order.belongsTo(User, { foreignKey: 'userId' });

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

        const categoriesCount = await Category.count();

            if (categoriesCount === 0) {
                await Category.bulkCreate([
                    { name: 'Игрушки' },
                    { name: 'Мини-игрушки' },
                    { name: 'Брелки' },
                    { name: 'Разное' }
                ]);

                console.log('Default categories created');
            }

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

        await queryInterface.changeColumn('orders', 'customerEmail', {
            type: DataTypes.STRING(255),
            allowNull: true
        });

        if (!ordersTable.customerPhone) {
            await queryInterface.addColumn('orders', 'customerPhone', {
                type: DataTypes.STRING(255),
                allowNull: false,
                defaultValue: ''
            });
        }

        if (!ordersTable.customerAddress) {
            await queryInterface.addColumn('orders', 'customerAddress', {
                type: DataTypes.TEXT,
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

        if (!ordersTable.userId) {
            await queryInterface.addColumn('orders', 'userId', {
                type: DataTypes.INTEGER.UNSIGNED,
                allowNull: true
            });
        }

        await queryInterface.sequelize.query(
            "UPDATE orders SET status = 'unprocessed' WHERE status = 'pending' OR status = 'cancelled'"
        );
        await queryInterface.sequelize.query(
            "UPDATE orders SET status = 'processing' WHERE status = 'paid'"
        );
        await queryInterface.changeColumn('orders', 'status', {
            type: DataTypes.ENUM('unprocessed', 'processing', 'shipped'),
            allowNull: false,
            defaultValue: 'unprocessed'
        });

        const usersTable = await queryInterface.describeTable('users');

        if (!usersTable.reset_token) {
            await queryInterface.addColumn('users', 'reset_token', {
                type: DataTypes.STRING(128),
                allowNull: true
            });
        }

        if (!usersTable.reset_token_exp) {
            await queryInterface.addColumn('users', 'reset_token_exp', {
                type: DataTypes.DATE,
                allowNull: true
            });
        }

        if (!usersTable.last_login_at) {
            await queryInterface.addColumn('users', 'last_login_at', {
                type: DataTypes.DATE,
                allowNull: true
            });
        }

        if (!usersTable.status) {
            await queryInterface.addColumn('users', 'status', {
                type: DataTypes.STRING(20),
                allowNull: false,
                defaultValue: 'active'
            });
        }

        await queryInterface.sequelize.query(
            "UPDATE users SET status = 'active' WHERE status IS NULL OR status = ''"
        );

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
                    status: 'active',
                    lastLoginAt: new Date(),
                    role: 'admin'
                },
                {
                    name: 'Customer',
                    email: process.env.USER_EMAIL,
                    password: userPass,
                    status: 'active',
                    lastLoginAt: new Date(),
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
    if (sequelize && User && Product && Category && Cart && CartItem && Order && OrderItem && Review) {
        return {
            sequelize,
            User,
            Product,
            Category,
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