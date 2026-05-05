const express = require('express');
const router = express.Router();

const { getModels } = require('../models');
const { Op } = require('sequelize');

router.get('/', async (req, res) => {

    try {
        let query = String(req.query.q || '').trim();

        // Basic validation: require at least 2 chars, limit length
        if (!query || query.length < 2) {
            return res.json([]);
        }

        if (query.length > 100) {
            query = query.substring(0, 100);
        }
        const { Product, Category } = getModels();
        

        const products = await Product.findAll({
            where: {
                name: {
                    [Op.like]: `%${query}%`
                }
            },
            include: [{ model: Category, as: 'category' }],
            limit: 50
        });

        res.json(products);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: 'Search error'
        });

    }

});

module.exports = router;