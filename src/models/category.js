const { DataTypes } = require('sequelize');
const sequelize = require('../configs/sequelize');

const Category = sequelize.define('Category', {
    
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false,
    },
    type: {
        type: DataTypes.ENUM('income', 'expense'),
        allowNull: false,
    },
    isDefault: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
}, {
    tableName: 'categories',
    paranoid: true,
    indexes: [
        { name: 'idx_categories_userId', fields: ['userId'] },
    ],
});

module.exports = { Category };
