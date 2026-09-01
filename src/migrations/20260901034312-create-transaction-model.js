'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('transactions', {
            id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.literal('gen_random_uuid()'),
                primaryKey: true,
            },
            userId: {
                type: Sequelize.UUID,
                allowNull: false,
                references: { model: 'users', key: 'id' },
                onDelete: 'CASCADE',
            },
            categoryId: {
                type: Sequelize.UUID,
                allowNull: false,
                references: { model: 'categories', key: 'id' },
                onDelete: 'RESTRICT',
            },
            amount:      { type: Sequelize.DECIMAL(12, 2), allowNull: false },
            type:        { type: Sequelize.ENUM('income', 'expense'), allowNull: false },
            date:        { type: Sequelize.DATEONLY, allowNull: false },
            description: { type: Sequelize.TEXT, allowNull: true },
            createdAt:   { type: Sequelize.DATE, allowNull: false },
            updatedAt:   { type: Sequelize.DATE, allowNull: false },
            deletedAt:   { type: Sequelize.DATE, allowNull: true },
        });

        await queryInterface.addIndex('transactions', ['userId', 'date'], {
            name: 'idx_transactions_userId_date',
        });
        await queryInterface.addIndex('transactions', ['userId', 'categoryId'], {
            name: 'idx_transactions_userId_categoryId',
        });
        await queryInterface.addIndex('transactions', ['userId', 'type'], {
            name: 'idx_transactions_userId_type',
        });
    },

    async down(queryInterface) {
        await queryInterface.removeIndex('transactions', 'idx_transactions_userId_date');
        await queryInterface.removeIndex('transactions', 'idx_transactions_userId_categoryId');
        await queryInterface.removeIndex('transactions', 'idx_transactions_userId_type');
        await queryInterface.dropTable('transactions');
    },
};