'use strict';
const { randomUUID } = require('crypto');
const bcrypt = require('bcryptjs');

const SEED_BATCH_DATE = new Date('2026-07-07T00:00:00.000Z');
const HASHED_PASSWORD = bcrypt.hashSync('P@ssw0rd!', 12);

const createUsers = (count, namePrefix, emailPrefix) =>
    Array.from({ length: count }).map((_, index) => ({
        id: randomUUID(),
        name: `${namePrefix} ${index + 1}`,
        email: `${emailPrefix}${index + 1}@seed.local`,
        passwordHash: HASHED_PASSWORD,
        createdAt: SEED_BATCH_DATE,
        updatedAt: SEED_BATCH_DATE,
    }));

module.exports = {
    async up(queryInterface) {
        const users = [
            ...createUsers(10, 'User', 'user'),
            ...createUsers(5, 'Venue', 'venue'),
            ...createUsers(3, 'Performer', 'performer'),
            ...createUsers(2, 'Admin', 'admin'),
        ];

        await queryInterface.bulkInsert('users', users, { ignoreDuplicates: true });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.bulkDelete(
            'users',
            { email: { [Sequelize.Op.like]: '%@seed.local' } },
            {}
        );
    },
};
