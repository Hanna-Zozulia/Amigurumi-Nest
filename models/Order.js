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
    customerName: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    customerEmail: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    customerPhone: {
      type: DataTypes.STRING(255),
      allowNull: false
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
      type: DataTypes.ENUM('pending','paid','shipped','cancelled'),
      defaultValue: 'pending'
    }
  }, {
    tableName: 'orders',
    timestamps: true
  });

  return Order;
};