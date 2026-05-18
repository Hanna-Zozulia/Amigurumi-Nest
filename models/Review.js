/**
 * Defines the Review model used to store product comments and moderation state.
 */
module.exports = (sequelize, DataTypes) => {
  const Review = sequelize.define('Review', {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    userId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false
    },
    productId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false
    },
    text: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('approved', 'hidden', 'blocked'),
      allowNull: false,
      defaultValue: 'approved'
    },
    blockedReason: {
      type: DataTypes.STRING(32),
      allowNull: true
    },
    adminReply: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'reviews',
    timestamps: true,
    paranoid: true
  });
  return Review;
};