//
module.exports = (sequelize, DataTypes) => {
  const CartItem = sequelize.define("CartItem", {
    cartId: DataTypes.INTEGER,
    productId: DataTypes.INTEGER,
    quantity: {
      type: DataTypes.INTEGER,
      defaultValue: 1
    }
  });

  return CartItem;
};
