// models/Order.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Order = sequelize.define('Order', {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    cartId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true
    },
    userId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true
    },
    customerName: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    customerEmail: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    customerPhone: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    customerAddress: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: ''
    },
    customerNotes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    total: {
      type: DataTypes.DECIMAL(10,2),
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('unprocessed','processing','shipped'),
      defaultValue: 'unprocessed'
    }
  }, {
    tableName: 'orders',
    timestamps: true
  });

  return Order;
};