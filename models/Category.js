/**
 * Defines the Category model and its product association helper.
 */
module.exports = (sequelize, DataTypes) => {
  const Category = sequelize.define("Category", {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },

    name: {
      type: DataTypes.STRING,
      allowNull: false
    }
  }, {
    tableName: "categories",
    timestamps: true
  });

  /**
   * Registers the Category -> Product association used by Sequelize.
   */
  Category.associate = (models) => {
    Category.hasMany(models.Product, {
      foreignKey: "categoryId",
      as: "products"
    });
  };

  return Category;
};