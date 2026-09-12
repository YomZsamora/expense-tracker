'use strict';

const sequelize = require('../configs/sequelize');
const redis = require('../configs/redis');

afterAll(async () => {
    await sequelize.close();
    await redis.disconnect();
});
