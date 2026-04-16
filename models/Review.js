module.exports = (sequelize, DataTypes) => {
  const Review = sequelize.define('Review', {
    text: {
      type: DataTypes.TEXT,
      allowNull: false
    }
  });

  return Review;
};