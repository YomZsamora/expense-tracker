'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('budgets', {
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
                onDelete: 'CASCADE',
            },
            amount: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
            month:  { type: Sequelize.SMALLINT, allowNull: false },
            year:   { type: Sequelize.SMALLINT, allowNull: false },
            createdAt: { type: Sequelize.DATE, allowNull: false },
            updatedAt: { type: Sequelize.DATE, allowNull: false },
        });

        await queryInterface.addConstraint('budgets', {
            fields: ['userId', 'categoryId', 'month', 'year'],
            type: 'unique',
            name: 'uq_budgets_userId_categoryId_month_year',
        });

        await queryInterface.addIndex('budgets', ['userId'], {
            name: 'idx_budgets_userId',
        });
        await queryInterface.addIndex('budgets', ['categoryId'], {
            name: 'idx_budgets_categoryId',
        });
    },

    async down(queryInterface) {
        await queryInterface.removeIndex('budgets', 'idx_budgets_categoryId');
        await queryInterface.removeIndex('budgets', 'idx_budgets_userId');
        await queryInterface.removeConstraint('budgets', 'uq_budgets_userId_categoryId_month_year');
        await queryInterface.dropTable('budgets');
    },
};
