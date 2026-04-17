//productController.js
// Контроллер для веб-части работы с товарами (страницы)
const { getModels } = require('../models');
const fs = require('fs/promises');
const path = require('path');
const nodemailer = require('nodemailer');

const categories = ['', 'Свечи для массажа', 'Ароматические', 'Декоративные', 'Подарочные наборы'];
const ORDER_RECEIVER_EMAIL = process.env.ORDER_RECEIVER_EMAIL || process.env.MAIL_TO || '';

function getSiteBaseUrl(req) {
    const configuredBaseUrl = String(process.env.APP_URL || process.env.BASE_URL || '').trim();
    if (configuredBaseUrl) {
        return configuredBaseUrl.replace(/\/$/, '');
    }

    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const host = req.get('host');

    return host ? `${protocol}://${host}` : '';
}

function getAbsoluteImageUrl(imagePath, baseUrl) {
    const value = String(imagePath || '').trim();
    if (!value) return '';

    if (/^(https?:)?\/\//i.test(value) || value.startsWith('data:')) {
        return value;
    }

    if (!baseUrl) {
        return value;
    }

    return `${baseUrl.replace(/\/$/, '')}/${value.replace(/^\//, '')}`;
}

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

async function buildInlineImageAttachment(imagePath, cidPrefix) {
    const value = String(imagePath || '').trim();
    if (!value) return null;

    const isRemote = /^(https?:)?\/\//i.test(value);
    const isData = value.startsWith('data:');

    if (isData) {
        const match = value.match(/^data:([^;]+);base64,(.+)$/i);
        if (!match) return null;

        const cid = `${cidPrefix}-${Date.now()}`;

        return {
            attachment: {
                cid,
                filename: `${cidPrefix}.png`,
                content: Buffer.from(match[2], 'base64'),
                contentType: match[1]
            },
            src: `cid:${cid}`
        };
    }

    if (isRemote) {
        if (typeof fetch !== 'function') {
            return null;
        }

        const response = await fetch(value);
        if (!response.ok) return null;

        const arrayBuffer = await response.arrayBuffer();
        const contentType = response.headers.get('content-type') || 'image/png';
        const extension = contentType.includes('jpeg') ? 'jpg' : contentType.includes('png') ? 'png' : contentType.includes('gif') ? 'gif' : 'png';
        const cid = `${cidPrefix}-${Date.now()}`;

        return {
            attachment: {
                cid,
                filename: `${cidPrefix}.${extension}`,
                content: Buffer.from(arrayBuffer),
                contentType
            },
            src: `cid:${cid}`
        };
    }

    const normalized = value.replace(/^\//, '');
    const filePath = path.resolve(process.cwd(), 'public', normalized);

    try {
        const content = await fs.readFile(filePath);
        const extension = path.extname(filePath).toLowerCase();
        const contentTypeMap = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp'
        };
        const contentType = contentTypeMap[extension] || 'image/png';
        const cid = `${cidPrefix}-${Date.now()}`;

        return {
            attachment: {
                cid,
                filename: path.basename(filePath),
                content,
                contentType
            },
            src: `cid:${cid}`
        };
    } catch {
        return null;
    }
}

function getOrderTransporter() {
    const host = process.env.MAIL_HOST;
    const port = Number(process.env.MAIL_PORT || 587);
    const secure = String(process.env.MAIL_SECURE || 'false') === 'true';
    const user = process.env.MAIL_USER;
    const pass = process.env.MAIL_PASS;
    const service = process.env.MAIL_SERVICE || 'gmail';

    if (host && user && pass) {
        return nodemailer.createTransport({
            host,
            port,
            secure,
            auth: { user, pass }
        });
    }

    if (host) {
        return nodemailer.createTransport({
            host,
            port,
            secure
        });
    }

    if (user && pass) {
        return nodemailer.createTransport({
            service,
            auth: { user, pass }
        });
    }

    return null;
}

async function sendOrderEmail(orderData, req) {
    const transporter = getOrderTransporter();
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

    const preparedItems = [];
    for (let index = 0; index < orderData.items.length; index += 1) {
        const item = orderData.items[index];
        const inlineImage = await buildInlineImageAttachment(item.image, `product-${index}`);
        preparedItems.push({
            ...item,
            imageCid: inlineImage?.src || '',
            attachment: inlineImage?.attachment || null,
            fallbackImageUrl: getAbsoluteImageUrl(item.image, baseUrl)
        });
    }

    const attachments = preparedItems
        .filter((item) => item.attachment)
        .map((item) => item.attachment);

    const productLines = preparedItems
        .map((item) => `- ${item.name} x${item.quantity} = ${item.lineTotal.toFixed(2)} EUR${item.fallbackImageUrl ? `\n  image: ${item.fallbackImageUrl}` : ''}`)
        .join('\n');

    const productCardsHtml = preparedItems.map((item) => {
        const imageHtml = item.imageCid
            ? `<img src="${item.imageCid}" alt="${escapeHtml(item.name)}" style="width:120px;height:120px;object-fit:cover;border-radius:12px;border:1px solid #e5e7eb;display:block;margin-bottom:8px;" />`
            : item.fallbackImageUrl
                ? `<img src="${item.fallbackImageUrl}" alt="${escapeHtml(item.name)}" style="width:120px;height:120px;object-fit:cover;border-radius:12px;border:1px solid #e5e7eb;display:block;margin-bottom:8px;" />`
                : '<div style="width:120px;height:120px;border-radius:12px;border:1px solid #e5e7eb;display:flex;align-items:center;justify-content:center;color:#6b7280;margin-bottom:8px;">No image</div>';

        return `
            <div style="border:1px solid #e5e7eb;border-radius:14px;padding:12px;margin-bottom:12px;">
                ${imageHtml}
                <div style="font-size:16px;font-weight:700;margin-bottom:4px;">${escapeHtml(item.name)}</div>
                <div style="color:#374151;margin-bottom:4px;">Кол-во: ${escapeHtml(item.quantity)}</div>
                <div style="color:#111827;font-weight:600;">${item.lineTotal.toFixed(2)} EUR</div>
            </div>
        `;
    }).join('');

    const text = [
        'Новый заказ с сайта Amigurumi Nest',
        '',
        `Имя: ${orderData.customerName}`,
        `Email: ${orderData.customerEmail}`,
        `Телефон: ${orderData.customerPhone}`,
        `Комментарий: ${orderData.customerNotes || '-'}`,
        '',
        'Состав заказа:',
        productLines,
        '',
        `Итого: ${orderData.total.toFixed(2)} EUR`
    ].join('\n');

    const html = `
        <div style="font-family:Arial,sans-serif;color:#111827;line-height:1.5;">
            <h2 style="margin:0 0 16px;">Новый заказ с сайта Amigurumi Nest</h2>
            <p><b>Имя:</b> ${escapeHtml(orderData.customerName)}</p>
            <p><b>Email:</b> ${escapeHtml(orderData.customerEmail)}</p>
            <p><b>Телефон:</b> ${escapeHtml(orderData.customerPhone)}</p>
            <p><b>Комментарий:</b> ${escapeHtml(orderData.customerNotes || '-')}</p>
            <h3 style="margin:24px 0 12px;">Состав заказа</h3>
            ${productCardsHtml}
            <p style="font-size:18px;font-weight:700;margin-top:20px;">Итого: ${orderData.total.toFixed(2)} EUR</p>
        </div>
    `;

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

async function homePage(req, res) {
    const { Product, Review, User } = getModels();

    const products = await Product.findAll();

    const reviews = await Review.findAll({
        include: [User],
        order: [['createdAt', 'DESC']],
        limit: 5
    });
    
    res.render('index', {
        title: 'Home',
        products,
        reviews,
        currentUser: req.session.user || null
    });
}

async function listPage(req, res) {
    const { Product, Cart, CartItem } = getModels();

    const categoryFilter = req.query.category || '';
    const where = categoryFilter ? { category: categoryFilter } : {};

    const products = await Product.findAll({ where });

    let cart = null;
    const userId = req.session.user?.id;

    if (userId) {
        cart = await Cart.findOne({
            where: { userId },
            include: [{ model: CartItem, as: 'items', include: [Product] }]
        });
    }

    res.render('catalog', {
        title: 'Catalog',
        products,
        categories,
        selectedCategory: categoryFilter,
        cart,
        currentUser: req.session.user || null
    });
}

async function top3Page(req, res) {
    const { Product } = getModels();

    const products = await Product.findAll({
        order: [['views', 'DESC']],
        limit: 3
    });

    res.render('top3', {
        title: 'Top 3',
        products,
        currentUser: req.session.user || null
    });
}

async function newForm(req, res) {
    res.render('product_form', { title: 'New Product', product: null, categories });
}

async function create(req, res) {
    const { Product } = getModels();
    await Product.create(req.body);
    res.redirect('/');
}

async function editForm(req, res) {
    const { Product } = getModels();
    const product = await Product.findByPk(req.params.id);

    if (!product) return res.status(404).send('Not found');

    res.render('product_form', { title: 'Edit Product', product, categories });
}

async function update(req, res) {
    const { Product } = getModels();
    const product = await Product.findByPk(req.params.id);

    if (!product) return res.status(404).send('Not found');

    await product.update(req.body);
    res.redirect('/');
}

async function remove(req, res) {
    const { Product } = getModels();
    const product = await Product.findByPk(req.params.id);

    if (!product) return res.status(404).send('Not found');

    await product.destroy();
    res.redirect('/');
}

async function showPage(req, res) {
    const { Product, Review, User  } = getModels();
    const product = await Product.findByPk(req.params.id, {
        include: [
            {
                model: Review,
                include: [User]
            }
        ]
    });

    if (!product) return res.status(404).render('404');

    await product.increment('views');

    res.render('product', {
        title: product.name,
        product,
        currentUser: req.session.user || null
    });
}

async function addReview(req, res) {
    const { Review } = getModels();

    const { text, productId } = req.body;

    await Review.create({
        text,
        productId,
        userId: req.session.user.id
    });

    res.redirect('/product/' + productId);
}

async function editReviewForm(req, res) {
    const { Review } = getModels();

    const review = await Review.findByPk(req.params.id);

    if (!review) return res.status(404).send('Not found');

    // защита: только свой отзыв
    if (review.userId !== req.session.user.id) {
        return res.status(403).send('Forbidden');
    }

    res.render('edit_review', { review });
}

async function updateReview(req, res) {
    const { Review } = getModels();

    const review = await Review.findByPk(req.params.id);

    if (!review) return res.status(404).send('Not found');

    if (review.userId !== req.session.user.id) {
        return res.status(403).send('Forbidden');
    }

    await review.update({
        text: req.body.text
    });

    res.redirect('/product/' + review.productId);
}

async function deleteReview(req, res) {
    const { Review } = getModels();

    const review = await Review.findByPk(req.params.id);

    if (!review) return res.status(404).send('Not found');

    // защита: только свой отзыв
    if (review.userId !== req.session.user.id) {
        return res.status(403).send('Forbidden');
    }

    await review.destroy();

    res.redirect('/product/' + review.productId);
}

async function replyReview(req, res) {
    const { Review } = getModels();

    const review = await Review.findByPk(req.params.id);
    if (!review) return res.status(404).send('Not found');

    if (!req.session.user) {
        return res.status(401).send('Not authorized');
    }

    if (req.session.user.role !== 'admin') {
        return res.status(403).send('Forbidden');
    }

    await review.update({
        adminReply: req.body.adminReply
    });

    res.redirect('/product/' + review.productId);
}

async function deleteReply(req, res) {
    const { Review } = getModels();

    const review = await Review.findByPk(req.params.id);

    if (!review) return res.status(404).send('Not found');

    if (!req.session.user) {
        return res.status(401).send('Not authorized');
    }

    await review.update({
        adminReply: null
    });

    res.redirect('/product/' + review.productId);
}

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

async function checkoutPage(req, res) {
    const { Product } = getModels();
        const successMessage = req.query.orderSent === '1'
                ? 'Ваш заказ отправлен, мы свяжемся с вами в течении 2-3 рабочих дней, для уточнения и обсуждения сроков выготовления'
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

  let total = 0;

  cart.items.forEach(item => {
    total += item.Product.price * item.quantity;
  });

  res.render('checkout', {
    cart,
    total,
        currentUser: req.session.user || null,
        successMessage
  });
}

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
        return res.redirect('/checkout');
    }

    const customerName = String(req.body.name || '').trim();
    const customerEmail = String(req.body.email || '').trim();
    const customerPhone = String(req.body.phone || '').trim();
    const customerNotes = String(req.body.notes || '').trim();

    if (!customerName || !customerEmail || !customerPhone) {
        return res.redirect('/checkout');
    }

    const total = cart.items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.Product?.price || 0), 0);

    const order = await Order.create({
        cartId: isLoggedIn ? cart.id : null,
        customerName,
        customerEmail,
        customerPhone,
        customerNotes: customerNotes || null,
        total
    });

    for (const item of cart.items) {
        if (!item.Product) continue;

        await OrderItem.create({
            orderId: order.id,
            productId: item.productId,
            quantity: item.quantity,
            price: item.Product.price
        });
    }

    const emailItems = cart.items
        .filter((item) => item.Product)
        .map((item) => ({
            name: item.Product.name,
                image: item.Product.image,
            quantity: Number(item.quantity),
            lineTotal: Number(item.quantity) * Number(item.Product.price)
        }));

    try {
        await sendOrderEmail({
            customerName,
            customerEmail,
            customerPhone,
            customerNotes,
            items: emailItems,
            total
            }, req);
    } catch (emailError) {
        console.error('Order email send error:', emailError.message);
    }

    if (isLoggedIn) {
        await CartItem.destroy({
            where: { cartId: cart.id }
        });
    }

    req.session.cart = { items: [] };

    res.redirect('/checkout?orderSent=1');
}

module.exports = { homePage, listPage, newForm, create, editForm, update, remove, showPage, top3Page, addReview, deleteReview, editReviewForm, updateReview, replyReview, deleteReply, checkoutPage, createOrder };