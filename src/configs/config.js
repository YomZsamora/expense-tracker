require('dotenv').config();

module.exports = {
    development: {
        username: process.env.POSTGRES_USER,
        password: process.env.POSTGRES_PASSWORD,
        database: process.env.POSTGRES_DATABASE,
        host: process.env.POSTGRES_HOST,
        dialect: 'postgres',
    },
    staging: {},
    production: {},
    test: {
        username: process.env.POSTGRES_USER,
        password: process.env.POSTGRES_PASSWORD,
        database: process.env.POSTGRES_DATABASE_TEST,
        host: process.env.POSTGRES_HOST,
        dialect: 'postgres',
    },
    app: {
        REDIS_URL: process.env.REDIS_URL,
        JWT_PRIVATE_KEY_PATH: process.env.JWT_PRIVATE_KEY_PATH,
        JWT_PUBLIC_KEY_PATH: process.env.JWT_PUBLIC_KEY_PATH,
        JWT_ISSUER: process.env.JWT_ISSUER,
        JWT_AUDIENCE: process.env.JWT_AUDIENCE,
        JWT_KEY_ID: process.env.JWT_KEY_ID,
        JWT_ACCESS_TOKEN_TTL: process.env.JWT_ACCESS_TOKEN_TTL,
        JWT_REFRESH_TOKEN_TTL: process.env.JWT_REFRESH_TOKEN_TTL,
    },
};
