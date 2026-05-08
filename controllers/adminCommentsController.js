const { Op } = require('sequelize');
const { getModels } = require('../models');
const { checkProfanity } = require('../services/profanityFilter');
const { invalidateReviewsCache } = require('../services/cacheService');
const { formatDateTimeRu } = require('../utils/dateFormatter');

const REVIEW_STATUSES = ['all', 'approved', 'hidden', 'blocked', 'deleted'];
const REVIEW_SORTS = ['newest', 'oldest'];

function parseReviewId(value) {
    const id = Number(value);
    return Number.isInteger(id) && id > 0 ? id : null;
}

function buildReturnToUrl(filters) {
    const params = new URLSearchParams();

    if (filters.status && filters.status !== 'all') params.set('status', filters.status);
    if (filters.sort && filters.sort !== 'newest') params.set('sort', filters.sort);
    if (filters.productId) params.set('productId', String(filters.productId));
    if (filters.q) params.set('q', filters.q);

    const queryString = params.toString();
    return queryString ? `/admin/comments?${queryString}` : '/admin/comments';
}

function normalizeTextSearch(value) {
    return String(value || '').trim();
}

function mapReview(review) {
    const isDeleted = Boolean(review.deletedAt);
    const status = isDeleted ? 'deleted' : (review.status || 'approved');

    return {
        id: review.id,
        text: review.text,
        status,
        statusLabel: {
            approved: 'Одобрен',
            hidden: 'Скрыт',
            blocked: 'Заблокирован',
            deleted: 'Удалён'
        }[status] || status,
        statusClass: {
            approved: 'bg-success',
            hidden: 'bg-secondary',
            blocked: 'bg-danger',
            deleted: 'bg-dark'
        }[status] || 'bg-secondary',
        adminReply: review.adminReply || '',
        hasReply: Boolean(review.adminReply),
        blockedReason: review.blockedReason || '',
        createdAt: review.createdAt,
        createdAtFormatted: formatDateTimeRu(review.createdAt),
        deletedAt: review.deletedAt || null,
        author: {
            id: review.User?.id || null,
            name: review.User?.name || `User #${review.userId}`,
            email: review.User?.email || ''
        },
        product: {
            id: review.Product?.id || review.productId,
            name: review.Product?.name || `Product #${review.productId}`
        }
    };
}

async function listCommentsPage(req, res) {
    try {
        const { Review, User, Product } = getModels();
        req.session.adminCommentsLastVisitAt = new Date().toISOString();

        const status = REVIEW_STATUSES.includes(String(req.query.status || '').trim().toLowerCase())
            ? String(req.query.status || '').trim().toLowerCase()
            : 'all';
        const sort = REVIEW_SORTS.includes(String(req.query.sort || '').trim().toLowerCase())
            ? String(req.query.sort || '').trim().toLowerCase()
            : 'newest';
        const productId = parseReviewId(req.query.productId);
        const q = normalizeTextSearch(req.query.q);
        const showDeleted = status === 'deleted';

        const where = {};

        if (status !== 'all' && status !== 'deleted') {
            where.status = status;
        }

        if (productId) {
            where.productId = productId;
        }

        if (showDeleted) {
            where.deletedAt = { [Op.not]: null };
        }

        if (q) {
            const like = `%${q}%`;
            where[Op.or] = [
                { text: { [Op.like]: like } },
                { '$User.name$': { [Op.like]: like } },
                { '$User.email$': { [Op.like]: like } },
                { '$Product.name$': { [Op.like]: like } }
            ];
        }

        const comments = await Review.findAll({
            where,
            paranoid: !showDeleted,
            include: [
                { model: User, attributes: ['id', 'name', 'email'] },
                { model: Product, attributes: ['id', 'name'] }
            ],
            order: [['createdAt', sort === 'oldest' ? 'ASC' : 'DESC']]
        });

        const products = await Product.findAll({
            attributes: ['id', 'name'],
            order: [['name', 'ASC']]
        });

        const [approvedCount, hiddenCount, blockedCount, replyCount] = await Promise.all([
            Review.count({ where: { status: 'approved' } }),
            Review.count({ where: { status: 'hidden' } }),
            Review.count({ where: { status: 'blocked' } }),
            Review.count({ where: { adminReply: { [Op.not]: null } } })
        ]);

        const deletedCount = await Review.count({
            paranoid: false,
            where: {
                deletedAt: { [Op.not]: null }
            }
        });

        return res.render('admin_comments', {
            title: 'Комментарии',
            currentUser: req.session.user || null,
            activeSection: 'comments',
            comments: comments.map(mapReview),
            products,
            filters: {
                status,
                sort,
                productId: productId ? String(productId) : '',
                q
            },
            stats: {
                total: comments.length,
                approvedCount,
                hiddenCount,
                blockedCount,
                deletedCount,
                replyCount
            },
            returnTo: buildReturnToUrl({ status, sort, productId, q })
        });
    } catch (err) {
        console.error('adminComments.listCommentsPage error:', err.message);
        return res.status(500).send('Internal server error');
    }
}

function getReturnTarget(req) {
    const value = String(req.body.returnTo || req.query.returnTo || '').trim();

    if (value.startsWith('/admin/comments')) {
        return value;
    }

    return '/admin/comments';
}

async function replyComment(req, res) {
    try {
        const { Review } = getModels();
        const reviewId = parseReviewId(req.params.id);

        if (!reviewId) {
            return res.status(400).send('Invalid review id');
        }

        const review = await Review.findByPk(reviewId);
        if (!review) {
            return res.status(404).send('Not found');
        }

        const adminReply = String(req.body.adminReply || '').trim();
        const moderationResult = checkProfanity(adminReply);
        if (moderationResult.flagged) {
            return res.status(400).send('Reply is blocked by moderation rules');
        }

        await review.update({ adminReply });
        await invalidateReviewsCache(review.productId);

        return res.redirect(getReturnTarget(req));
    } catch (err) {
        console.error('adminComments.replyComment error:', err.message);
        return res.status(500).send('Internal server error');
    }
}

async function approveComment(req, res) {
    try {
        const { Review } = getModels();
        const reviewId = parseReviewId(req.params.id);

        if (!reviewId) {
            return res.status(400).send('Invalid review id');
        }

        const review = await Review.findByPk(reviewId);
        if (!review) {
            return res.status(404).send('Not found');
        }

        await review.update({ status: 'approved' });
        await invalidateReviewsCache(review.productId);

        return res.redirect(getReturnTarget(req));
    } catch (err) {
        console.error('adminComments.approveComment error:', err.message);
        return res.status(500).send('Internal server error');
    }
}

async function hideComment(req, res) {
    try {
        const { Review } = getModels();
        const reviewId = parseReviewId(req.params.id);

        if (!reviewId) {
            return res.status(400).send('Invalid review id');
        }

        const review = await Review.findByPk(reviewId);
        if (!review) {
            return res.status(404).send('Not found');
        }

        await review.update({ status: 'hidden' });
        await invalidateReviewsCache(review.productId);

        return res.redirect(getReturnTarget(req));
    } catch (err) {
        console.error('adminComments.hideComment error:', err.message);
        return res.status(500).send('Internal server error');
    }
}

async function deleteComment(req, res) {
    try {
        const { Review } = getModels();
        const reviewId = parseReviewId(req.params.id);

        if (!reviewId) {
            return res.status(400).send('Invalid review id');
        }

        const review = await Review.findByPk(reviewId);
        if (!review) {
            return res.status(404).send('Not found');
        }

        const productId = review.productId;
        await review.destroy();
        await invalidateReviewsCache(productId);

        return res.redirect(getReturnTarget(req));
    } catch (err) {
        console.error('adminComments.deleteComment error:', err.message);
        return res.status(500).send('Internal server error');
    }
}

async function restoreComment(req, res) {
    try {
        const { Review } = getModels();
        const reviewId = parseReviewId(req.params.id);

        if (!reviewId) {
            return res.status(400).send('Invalid review id');
        }

        const review = await Review.findByPk(reviewId, { paranoid: false });
        if (!review) {
            return res.status(404).send('Not found');
        }

        if (!review.deletedAt) {
            return res.redirect(getReturnTarget(req));
        }

        await review.restore();
        await invalidateReviewsCache(review.productId);

        return res.redirect(getReturnTarget(req));
    } catch (err) {
        console.error('adminComments.restoreComment error:', err.message);
        return res.status(500).send('Internal server error');
    }
}

module.exports = {
    listCommentsPage,
    approveComment,
    replyComment,
    hideComment,
    deleteComment,
    restoreComment
};