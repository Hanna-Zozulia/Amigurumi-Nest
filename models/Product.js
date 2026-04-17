// Модель товара
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Product = sequelize.define(
        'Product',
        {
            id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
            name: { type: DataTypes.STRING(255), allowNull: false },
            desc: { type: DataTypes.TEXT, allowNull: false },
            price: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0},
            image: { type: DataTypes.STRING(255), allowNull: false },
            image2: { type: DataTypes.STRING(255), allowNull: false },
            category: { type: DataTypes.STRING(255), allowNull: false},
            views: { type: DataTypes.INTEGER, defaultValue: 0 }
        },
        {
            tableName: 'products',
            timestamps: true
        }
    );
    return Product;
};