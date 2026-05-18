const nodemailer = require('nodemailer');
const fs = require('fs/promises');
const path = require('path');
const { escapeHtml } = require('../utils/htmlUtils');

/**
 * Builds and returns a nodemailer transporter based on environment configuration.
 * Returns null when mail settings are not available.
 */
function getMailTransporter() {
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

/**
 * Builds an inline image attachment for use in emails.
 * Supports data URIs, remote URLs (when fetch is available), and local files.
 * Returns an object with `attachment` and `src` fields or null on failure.
 */
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

/**
 * Renders a small HTML card for an order product line to embed into email HTML.
 */
function buildProductCardHtml(item) {
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
}

/**
 * Builds a plain-text representation of order product lines for email texts.
 */
function buildProductLinesText(items) {
    return items
        .map((item) => `- ${item.name} x${item.quantity} = ${item.lineTotal.toFixed(2)} EUR${item.fallbackImageUrl ? `\n  image: ${item.fallbackImageUrl}` : ''}`)
        .join('\n');
}

/**
 * Assembles the plain-text body for an order notification email.
 */
function buildOrderEmailText(orderData, productLines) {
    return [
        'Новый заказ с сайта Amigurumi Nest',
        '',
        `Имя: ${orderData.customerName}`,
        `Email: ${orderData.customerEmail || '-'}`,
        `Телефон: ${orderData.customerPhone}`,
        `Адрес: ${orderData.customerAddress}`,
        `Комментарий: ${orderData.customerNotes || '-'}`,
        '',
        'Состав заказа:',
        productLines,
        '',
        `Итого: ${orderData.total.toFixed(2)} EUR`
    ].join('\n');
}

/**
 * Assembles the HTML body for an order notification email, including product cards.
 */
function buildOrderEmailHtml(orderData, productCardsHtml) {
    return `
        <div style="font-family:Arial,sans-serif;color:#111827;line-height:1.5;">
            <h2 style="margin:0 0 16px;">Новый заказ с сайта Amigurumi Nest</h2>
            <p><b>Имя:</b> ${escapeHtml(orderData.customerName)}</p>
            <p><b>Email:</b> ${escapeHtml(orderData.customerEmail || '-')}</p>
            <p><b>Телефон:</b> ${escapeHtml(orderData.customerPhone)}</p>
            <p><b>Адрес:</b> ${escapeHtml(orderData.customerAddress)}</p>
            <p><b>Комментарий:</b> ${escapeHtml(orderData.customerNotes || '-')}</p>
            <h3 style="margin:24px 0 12px;">Состав заказа</h3>
            ${productCardsHtml}
            <p style="font-size:18px;font-weight:700;margin-top:20px;">Итого: ${orderData.total.toFixed(2)} EUR</p>
        </div>
    `;
}

module.exports = {
    getMailTransporter,
    buildInlineImageAttachment,
    buildProductCardHtml,
    buildProductLinesText,
    buildOrderEmailText,
    buildOrderEmailHtml
};
