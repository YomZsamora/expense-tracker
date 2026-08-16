'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn('users', 'name', {
            type: Sequelize.STRING(100),
            allowNull: false,
            defaultValue: '',
        });

        await queryInterface.addColumn('users', 'deletedAt', {
            type: Sequelize.DATE,
            allowNull: true,
        });

        await queryInterface.renameColumn('users', 'password', 'passwordHash');

        await queryInterface.removeColumn('users', 'role');
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.addColumn('users', 'role', {
            type: Sequelize.STRING,
            allowNull: false,
            defaultValue: 'user',
        });

        await queryInterface.renameColumn('users', 'passwordHash', 'password');

        await queryInterface.removeColumn('users', 'deletedAt');

        await queryInterface.removeColumn('users', 'name');
    },
};
