const { getModels } = require('../models');
const { getMailTransporter, buildInlineImageAttachment, buildProductCardHtml, buildProductLinesText, buildOrderEmailText, buildOrderEmailHtml } = require('./emailService');
const { getSiteBaseUrl, getAbsoluteImageUrl } = require('../utils/htmlUtils');

const ORDER_RECEIVER_EMAIL = process.env.ORDER_RECEIVER_EMAIL || process.env.MAIL_TO || '';

/**
 * Loads the checkout cart for the current request.
 * For authenticated users it reads the persistent cart; for guests it reconstructs
 * the cart from session data and attaches Product instances when available.
 */
async function loadCheckoutCart(req, Product) {
    if (req.session.user) {
        const { Cart, CartItem } = getModels();

        const cart = await Cart.findOne({
            where: { userId: req.session.user.id },
            include: [{ model: CartItem, as: 'items', include: [Product] }]
        });

        return cart || { items: [] };
    }

    const sessionItems = Array.isArray(req.session.cart?.items) ? req.session.cart.items : [];

    if (sessionItems.length === 0) {
        return { items: [] };
    }

    const products = await Product.findAll({
        where: { id: sessionItems.map((item) => item.productId) }
    });

    const productMap = new Map(products.map((product) => [String(product.id), product]));

    return {
        items: sessionItems.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            Product: productMap.get(String(item.productId)) || null
        }))
    };
}

/**
 * Calculates the numeric total for a cart by summing line totals.
 */
function calculateCartTotal(cart) {
    let total = 0;
    cart.items.forEach(item => {
        total += item.Product.price * item.quantity;
    });
    return total;
}

/**
 * Prepares and sends an order notification email to the configured recipient.
 * Returns true on success and false when mail cannot be sent or is misconfigured.
 */
async function sendOrderEmail(orderData, req) {
    const transporter = getMailTransporter();
    if (!transporter) {
        console.warn('MAIL_* settings are missing. Order email was not sent.');
        return false;
    }

    if (!ORDER_RECEIVER_EMAIL) {
        console.warn('ORDER_RECEIVER_EMAIL is missing. Order email was not sent.');
        return false;
    }

    const from = process.env.MAIL_FROM || process.env.MAIL_USER;
    if (!from) {
        console.warn('MAIL_FROM or MAIL_USER is missing. Order email was not sent.');
        return false;
    }

    const baseUrl = getSiteBaseUrl(req);

    const preparedItems = await Promise.all(orderData.items.map(async (item, index) => {
        const inlineImage = await buildInlineImageAttachment(item.image, `product-${index}`);

        return {
            ...item,
            imageCid: inlineImage?.src || '',
            attachment: inlineImage?.attachment || null,
            fallbackImageUrl: getAbsoluteImageUrl(item.image, baseUrl)
        };
    }));

    const attachments = preparedItems
        .filter((item) => item.attachment)
        .map((item) => item.attachment);

    const productLines = buildProductLinesText(preparedItems);
    const productCardsHtml = preparedItems.map(buildProductCardHtml).join('');

    const text = buildOrderEmailText(orderData, productLines);
    const html = buildOrderEmailHtml(orderData, productCardsHtml);

    await transporter.sendMail({
        from,
        to: ORDER_RECEIVER_EMAIL,
        subject: `Новый заказ на сумму ${orderData.total.toFixed(2)} EUR`,
        text,
        html,
        attachments
    });

    return true;
}

module.exports = {
    loadCheckoutCart,
    calculateCartTotal,
    sendOrderEmail
};
