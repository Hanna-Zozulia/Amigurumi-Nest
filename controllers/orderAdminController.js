const { getModels } = require('../models');

const ORDER_STATUSES = ['unprocessed', 'processing', 'shipped'];
const STATUS_LABELS = {
    unprocessed: 'Не обработан',
    processing: 'В работе',
    shipped: 'Отправлен'
};

function parseOrderId(value) {
    const id = Number(value);
    return Number.isInteger(id) && id > 0 ? id : null;
}

function getNextStatus(status) {
    const index = ORDER_STATUSES.indexOf(status);
    if (index === -1) {
        return ORDER_STATUSES[0];
    }

    return ORDER_STATUSES[(index + 1) % ORDER_STATUSES.length];
}

function mapStatusLabel(status) {
    return STATUS_LABELS[status] || status;
}

function formatDate(dateValue) {
    if (!dateValue) return '';

    return new Date(dateValue).toLocaleString('ru-RU', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function normalizeOrder(order) {
    const items = Array.isArray(order.items)
        ? order.items.map((item) => ({
            id: item.id,
            productId: item.productId,
            productName: item.Product?.name || `Товар #${item.productId}`,
            quantity: Number(item.quantity || 0),
            image: item.Product?.image || null,
            price: Number(item.price || 0),
            lineTotal: Number(item.quantity || 0) * Number(item.price || 0)
        }))
        : [];

    return {
        id: order.id,
        userId: order.userId || null,
        customerName: order.customerName,
        customerEmail: order.customerEmail || '',
        customerPhone: order.customerPhone,
        customerAddress: order.customerAddress || '',
        customerNotes: order.customerNotes || '',
        total: Number(order.total || 0),
        status: order.status,
        statusLabel: mapStatusLabel(order.status),
        createdAt: order.createdAt,
        createdAtFormatted: formatDate(order.createdAt),
        items
    };
}

async function findOrderById(orderId) {
    const { Order, OrderItem, Product } = getModels();

    return Order.findByPk(orderId, {
        include: [
            {
                model: OrderItem,
                as: 'items',
                include: [{ model: Product, attributes: ['id', 'name', 'image'] }]
            }
        ],
        order: [[{ model: OrderItem, as: 'items' }, 'id', 'ASC']]
    });
}

async function listOrdersPage(req, res) {
    try {
        const { Order, OrderItem, Product } = getModels();

        const orders = await Order.findAll({
            include: [
                {
                    model: OrderItem,
                    as: 'items',
                    include: [{ model: Product, attributes: ['id', 'name', 'image'] }]
                }
            ],
            order: [['createdAt', 'DESC']]
        });

        return res.render('admin_orders', {
            title: 'Заказы',
            orders: orders.map(normalizeOrder),
            currentUser: req.session.user || null,
            activeSection: 'orders',
            statusLabels: STATUS_LABELS
        });
    } catch (err) {
        console.error('orderAdmin.listOrdersPage error:', err.message);
        return res.status(500).send('Internal server error');
    }
}

async function orderDetailsPage(req, res) {
    try {
        const orderId = parseOrderId(req.params.id);
        if (!orderId) {
            return res.status(400).send('Invalid order id');
        }

        const order = await findOrderById(orderId);
        if (!order) {
            return res.status(404).send('Order not found');
        }

        return res.render('admin_order_details', {
            title: `Заказ #${order.id}`,
            order: normalizeOrder(order),
            currentUser: req.session.user || null,
            activeSection: 'orders',
            statusLabels: STATUS_LABELS,
            nextStatus: getNextStatus(order.status)
        });
    } catch (err) {
        console.error('orderAdmin.orderDetailsPage error:', err.message);
        return res.status(500).send('Internal server error');
    }
}

async function updateOrderStatus(req, res) {
    const orderId = parseOrderId(req.params.id);
    if (!orderId) {
        return res.status(400).json({ error: 'Invalid order id' });
    }

    try {
        const { Order } = getModels();
        const order = await Order.findByPk(orderId);

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        const requestedStatus = String(req.body.status || '').trim().toLowerCase();
        const nextStatus = ORDER_STATUSES.includes(requestedStatus)
            ? requestedStatus
            : getNextStatus(order.status);

        await order.update({ status: nextStatus });

        return res.json({
            ok: true,
            orderId: order.id,
            status: order.status,
            statusLabel: mapStatusLabel(order.status)
        });
    } catch (err) {
        console.error('orderAdmin.updateOrderStatus error:', err.message);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

async function updateOrderStatusPage(req, res) {
    const orderId = parseOrderId(req.params.id);
    if (!orderId) {
        return res.status(400).send('Invalid order id');
    }

    try {
        const { Order } = getModels();
        const order = await Order.findByPk(orderId);

        if (!order) {
            return res.status(404).send('Order not found');
        }

        const requestedStatus = String(req.body.status || '').trim().toLowerCase();
        const nextStatus = ORDER_STATUSES.includes(requestedStatus)
            ? requestedStatus
            : getNextStatus(order.status);

        await order.update({ status: nextStatus });

        const redirectTo = String(req.body.redirectTo || '').trim();
        if (redirectTo === 'list') {
            return res.redirect('/admin/orders');
        }

        return res.redirect(`/admin/orders/${order.id}`);
    } catch (err) {
        console.error('orderAdmin.updateOrderStatusPage error:', err.message);
        return res.status(500).send('Internal server error');
    }
}

async function listOrdersApi(req, res) {
    try {
        const { Order, OrderItem, Product } = getModels();

        const orders = await Order.findAll({
            include: [
                {
                    model: OrderItem,
                    as: 'items',
                    include: [{ model: Product, attributes: ['id', 'name', 'image'] }]
                }
            ],
            order: [['createdAt', 'DESC']]
        });

        return res.json(orders.map(normalizeOrder));
    } catch (err) {
        console.error('orderAdmin.listOrdersApi error:', err.message);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

async function orderDetailsApi(req, res) {
    try {
        const orderId = parseOrderId(req.params.id);
        if (!orderId) {
            return res.status(400).json({ error: 'Invalid order id' });
        }

        const order = await findOrderById(orderId);
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        return res.json(normalizeOrder(order));
    } catch (err) {
        console.error('orderAdmin.orderDetailsApi error:', err.message);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

module.exports = {
    ORDER_STATUSES,
    STATUS_LABELS,
    listOrdersPage,
    orderDetailsPage,
    updateOrderStatusPage,
    listOrdersApi,
    orderDetailsApi,
    updateOrderStatus
};
