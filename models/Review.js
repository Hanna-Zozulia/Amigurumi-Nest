module.exports = (sequelize, DataTypes) => {
  const Review = sequelize.define('Review', {
    text: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    adminReply: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  });
  return Review;
};