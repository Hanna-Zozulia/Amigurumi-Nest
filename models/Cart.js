//
module.exports = (sequelize, DataTypes) => {
  const Cart = sequelize.define("Cart", {
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  });

  Cart.associate = models => {
    Cart.hasMany(models.CartItem, { as: "items" });
  };

  return Cart;
};
