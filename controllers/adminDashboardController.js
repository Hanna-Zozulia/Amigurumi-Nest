const { getModels } = require('../models');

async function adminDashboard(req, res) {
    try {
        const { Order, OrderItem, User, Product } = getModels();
        const { Op } = require('sequelize');

        // Общая статистика
        const ordersCount = await Order.count();
        const usersCount = await User.count();
        const productsCount = await Product.count();
        
        const totalOrdersResult = await Order.findAll({
            attributes: [
                [require('sequelize').fn('SUM', require('sequelize').col('total')), 'totalSum']
            ],
            raw: true
        });
        const totalOrdersSum = totalOrdersResult[0]?.totalSum || 0;

        // Статистика по статусам заказов
        const ordersByStatus = await Order.findAll({
            attributes: [
                'status',
                [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
            ],
            group: ['status'],
            raw: true
        });

        const ordersStatus = {
            unprocessed: 0,
            processing: 0,
            shipped: 0
        };

        ordersByStatus.forEach(item => {
            if (item.status in ordersStatus) {
                ordersStatus[item.status] = Number(item.count || 0);
            }
        });

        // Статистика по статусам пользователей
        const usersByStatus = await User.findAll({
            attributes: [
                'status',
                [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
            ],
            group: ['status'],
            raw: true
        });

        const usersStatus = {
            active: 0,
            inactive: 0,
            suspended: 0
        };

        usersByStatus.forEach(item => {
            if (item.status in usersStatus) {
                usersStatus[item.status] = Number(item.count || 0);
            }
        });

        // Недавние заказы
        const recentOrders = await Order.findAll({
            include: [
                {
                    model: OrderItem,
                    as: 'items',
                    include: [{ model: Product, attributes: ['id', 'name'] }]
                }
            ],
            order: [['createdAt', 'DESC']],
            limit: 5
        });

        const normalizeOrder = (order) => {
            return {
                id: order.id,
                customerName: order.customerName,
                status: order.status,
                statusLabel: {
                    'unprocessed': 'Не обработан',
                    'processing': 'В работе',
                    'shipped': 'Отправлен'
                }[order.status] || order.status,
                total: Number(order.total || 0)
            };
        };

        return res.render('admin_dashboard', {
            title: 'Дашборд',
            currentUser: req.session.user,
            activeSection: 'dashboard',
            stats: {
                ordersCount,
                usersCount,
                productsCount,
                totalOrdersSum: Number(totalOrdersSum || 0),
                ordersStatus,
                usersStatus
            },
            recentOrders: recentOrders.map(normalizeOrder)
        });
    } catch (err) {
        console.error('adminDashboard error:', err.message);
        return res.status(500).send('Internal server error');
    }
}

module.exports = { adminDashboard };
