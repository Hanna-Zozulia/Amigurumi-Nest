// Модель пользователя
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const User = sequelize.define(
        'User',
        {
            id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
            name: { type: DataTypes.STRING(255), allowNull: false },
            email: { type: DataTypes.STRING(255), allowNull: false, unique: true },
            password: { type: DataTypes.STRING(255), allowNull: false },
            resetToken: { type: DataTypes.STRING(128), allowNull: true, field: 'reset_token' },
            resetTokenExp: { type: DataTypes.DATE, allowNull: true, field: 'reset_token_exp' },
            role: { type: DataTypes.ENUM('admin', 'user'), allowNull: false, defaultValue: 'user' }
        },
        {
            tableName: 'users',
            timestamps: true
        }
    );
    return User;
};