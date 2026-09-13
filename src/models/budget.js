const { DataTypes } = require('sequelize');
const sequelize = require('../configs/sequelize');

const Budget = sequelize.define('Budget', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    categoryId: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    amount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
    },
    month: {
        type: DataTypes.SMALLINT,
        allowNull: false,
    },
    year: {
        type: DataTypes.SMALLINT,
        allowNull: false,
    },
}, {
    tableName: 'budgets',
    paranoid: false,
    indexes: [
        { name: 'idx_budgets_userId',    fields: ['userId'] },
        { name: 'idx_budgets_categoryId', fields: ['categoryId'] },
    ],
});

module.exports = { Budget };
