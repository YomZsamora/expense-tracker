const { DataTypes } = require('sequelize');
const sequelize = require('../configs/sequelize');

const Transaction = sequelize.define('Transaction', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false
    },
    categoryId: {
        type: DataTypes.UUID,
        allowNull: false
    },
    amount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false
    },
    type: {
        type: DataTypes.ENUM('income', 'expense'),
        allowNull: false
    },
    date: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
}, {
    tableName: 'transactions',
    paranoid: true,
    indexes: [
        { name: 'idx_transactions_userId_date',       fields: ['userId', 'date'] },
        { name: 'idx_transactions_userId_categoryId', fields: ['userId', 'categoryId'] },
        { name: 'idx_transactions_userId_type',       fields: ['userId', 'type'] },
    ],
});

module.exports = { Transaction };
