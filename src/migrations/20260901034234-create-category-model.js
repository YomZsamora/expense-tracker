'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('categories', {
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
            name:      { type: Sequelize.STRING(100), allowNull: false },
            type:      { type: Sequelize.ENUM('income', 'expense'), allowNull: false },
            isDefault: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
            createdAt: { type: Sequelize.DATE, allowNull: false },
            updatedAt: { type: Sequelize.DATE, allowNull: false },
            deletedAt: { type: Sequelize.DATE, allowNull: true },
        });

        // Regular index for all userId lookups
        await queryInterface.addIndex('categories', ['userId'], {
            name: 'idx_categories_userId',
        });

        // Partial unique index — uniqueness only enforced for active (non-deleted) rows
        await queryInterface.sequelize.query(`
            CREATE UNIQUE INDEX idx_categories_userId_name_type_active
            ON categories ("userId", name, type)
            WHERE "deletedAt" IS NULL;
        `);
    },

    async down(queryInterface) {
        await queryInterface.sequelize.query(
            'DROP INDEX IF EXISTS idx_categories_userId_name_type_active;'
        );
        await queryInterface.removeIndex('categories', 'idx_categories_userId');
        await queryInterface.dropTable('categories');
    },
};