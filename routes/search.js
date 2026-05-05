const express = require('express');
const router = express.Router();

const { getModels } = require('../models');
const { Op } = require('sequelize');

router.get('/', async (req, res) => {

    try {

        const query = req.query.q;

        if (!query) {
            return res.json([]);
        }
        const { Product, Category } = getModels();
        
        const products = await Product.findAll({

            where: {
                name: {
                    [Op.like]: `%${query}%`
                }
            },

            include: [{ model: Category, as: 'category' }]

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