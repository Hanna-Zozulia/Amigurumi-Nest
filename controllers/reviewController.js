// controllers/reviewController.js
// Review/Comment handling

const { getModels } = require('../models');
const { checkProfanity } = require('../services/profanityFilter');
const { invalidateReviewsCache } = require('../services/cacheService');
const { getMailTransporter } = require('../services/emailService');

const ORDER_RECEIVER_EMAIL = process.env.ORDER_RECEIVER_EMAIL || process.env.MAIL_TO || '';
let lastReviewEmailAt = 0;
const EMAIL_COOLDOWN_MS = 5 * 60 * 1000;

async function addReview(req, res) {
    try {
        const { Review } = getModels();
        const { productId } = req.body;
        const reviewText = String(req.body.text || '').toLowerCase().trim();

        if (!req.session.user) {
            return res.redirect('/login');
        }

        const moderationResult = checkProfanity(reviewText);
        if (moderationResult.flagged) {
            return res.redirect('/product/' + productId + '?reviewError=blocked');
        }

        await Review.create({
            text: reviewText,
            productId,
            userId: req.session.user.id,
            status: 'approved'
        });

        await invalidateReviewsCache(productId);

        const now = Date.now();
        if (now - lastReviewEmailAt > EMAIL_COOLDOWN_MS) {
            const transporter = getMailTransporter();
            const from = process.env.MAIL_FROM || process.env.MAIL_USER;
            if (transporter && ORDER_RECEIVER_EMAIL && from) {
                await transporter.sendMail({
                    from,
                    to: ORDER_RECEIVER_EMAIL,
                    subject: `Новый комментарий к товару #${productId}`,
                    text: `Пользователь #${req.session.user.id} оставил комментарий:\n\n${reviewText}`
                });
                lastReviewEmailAt = now;
            }
        }

        return res.redirect('/product/' + productId);

    } catch (err) {
        console.error('addReview error:', err);
        return res.status(500).send('Error adding review');
    }
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

    const reviewText = String(req.body.text || '').toLowerCase().trim();

    const moderationResult = checkProfanity(reviewText);
    if (moderationResult.flagged) {
        return res.redirect('/product/' + review.productId + '?reviewError=blocked');
    }

    await review.update({
        text: reviewText
    });

    await invalidateReviewsCache(review.productId);

    return res.redirect('/product/' + review.productId);
}

async function deleteReview(req, res) {
    const { Review } = getModels();

    const review = await Review.findByPk(req.params.id);

    if (!review) return res.status(404).send('Not found');

    if (!req.session.user) {
        return res.status(401).send('Not authorized');
    }

    const isAdmin = req.session.user.role === 'admin';
    const isOwner = review.userId === req.session.user.id;
    const hasAdminReply = Boolean(review.adminReply);

    if (isAdmin) {
        await review.destroy();
        await invalidateReviewsCache(review.productId);
        return res.redirect('/product/' + review.productId);
    }

    if (!isOwner) {
        return res.status(403).send('Forbidden');
    }

    if (hasAdminReply) {
        return res.status(403).send('Нельзя удалить комментарий после ответа администратора');
    }

    await review.destroy();

    await invalidateReviewsCache(review.productId);

    return res.redirect('/product/' + review.productId);
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

    const adminReplyText = String(req.body.adminReply || '').toLowerCase().trim();

    const moderationResult = checkProfanity(adminReplyText);
    if (moderationResult.flagged) {
        return res.redirect('/product/' + review.productId + '?reviewError=blocked');
    }

    await review.update({
        adminReply: adminReplyText
    });

    await invalidateReviewsCache(review.productId);

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

    await invalidateReviewsCache(review.productId);

    res.redirect('/product/' + review.productId);
}

module.exports = {
    addReview,
    editReviewForm,
    updateReview,
    deleteReview,
    replyReview,
    deleteReply
};
