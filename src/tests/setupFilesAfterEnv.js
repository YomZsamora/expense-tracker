'use strict';

const sequelize = require('../configs/sequelize');
const redis = require('../configs/redis');
const { User } = require('../models/user');
const { faker } = require('@faker-js/faker');

beforeAll(async () => {

    await User.findOrCreate({
        where: { email: 'test.user@example.com' },
        defaults: {
            name: faker.person.fullName(),
            passwordHash: 'irrelevant',
        },
    });

});

afterAll(async () => {
    await sequelize.close();
    await redis.disconnect();
});
