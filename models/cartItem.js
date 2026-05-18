/**
 * Defines the CartItem model used to store products and quantities inside a cart.
 */
module.exports = (sequelize, DataTypes) => {
  const CartItem = sequelize.define("CartItem", {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    cartId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false
    },
    productId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false
    },
    quantity: {
      type: DataTypes.INTEGER.UNSIGNED,
      defaultValue: 1
    }
  });

  return CartItem;
};
