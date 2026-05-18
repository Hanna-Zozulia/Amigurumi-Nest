const { getModels } = require('../models');
const { loadCheckoutCart, calculateCartTotal, sendOrderEmail } = require('../services/orderService');

/**
 * Renders the checkout page with the current cart totals.
 */
async function checkoutPage(req, res) {
    const { Product } = getModels();
    const successMessage = req.query.orderSent === '1'
        ? 'Ваш заказ отправлен, мы свяжемся с вами в течении 2-3 рабочих дней, для уточнения и обсуждения сроков изготовления.'
        : null;

    const cart = await loadCheckoutCart(req, Product);

    if (!cart || !cart.items) {
        return res.render('checkout', {
            cart: { items: [] },
            total: 0,
            currentUser: req.session.user || null,
            successMessage
        });
    }

    const total = calculateCartTotal(cart);

    res.render('checkout', {
        cart,
        total,
        currentUser: req.session.user || null,
        successMessage
    });
}

/**
 * Creates an order, persists its items, clears the cart, and triggers the email notification.
 */
async function createOrder(req, res) {
    const { Cart, CartItem, Order, OrderItem, Product } = getModels();

    const isLoggedIn = Boolean(req.session.user?.id);

    const cart = isLoggedIn
        ? await Cart.findOne({
            where: { userId: req.session.user.id },
            include: [{ model: CartItem, as: 'items', include: [Product] }]
        })
        : await loadCheckoutCart(req, Product);

    if (!cart || !cart.items || cart.items.length === 0) {
        return res.status(400).send('Cart is empty');
    }

    const customerName = String(req.body.name || '').trim();
    const customerEmail = String(req.body.email || '').trim();
    const customerPhone = String(req.body.phone || '').trim();
    const customerAddress = String(req.body.address || '').trim();
    const customerNotes = String(req.body.notes || '').trim();

    if (!customerName || !customerPhone || !customerAddress) {
        return res.redirect('/checkout');
    }

    const total = cart.items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.Product?.price || 0), 0);

    const order = await Order.create({
        cartId: isLoggedIn ? cart.id : null,
        userId: isLoggedIn ? req.session.user.id : null,
        customerName,
        customerEmail: customerEmail || null,
        customerPhone,
        customerAddress,
        customerNotes: customerNotes || null,
        total
    });

    const orderItems = cart.items
        .filter((item) => item.Product)
        .map((item) => ({
            orderId: order.id,
            productId: item.productId,
            quantity: item.quantity,
            price: item.Product.price
        }));

    await Promise.all([
        orderItems.length > 0
            ? OrderItem.bulkCreate(orderItems, { validate: false })
            : Promise.resolve(),
        isLoggedIn
            ? CartItem.destroy({
                where: { cartId: cart.id }
            })
            : Promise.resolve()
    ]);

    const emailItems = cart.items
        .filter((item) => item.Product)
        .map((item) => ({
            name: item.Product.name,
            image: item.Product.image,
            quantity: Number(item.quantity),
            lineTotal: Number(item.quantity) * Number(item.Product.price)
        }));

    req.session.cart = { items: [] };

    res.redirect('/checkout?orderSent=1');

    setImmediate(() => {
        void sendOrderEmail({
            customerName,
            customerEmail,
            customerPhone,
            customerAddress,
            customerNotes,
            items: emailItems,
            total
        }, req).catch((emailError) => {
            console.error('Order email send error:', emailError.message);
        });
    });
}

module.exports = {
    checkoutPage,
    createOrder
};
