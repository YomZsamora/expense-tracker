const jwt = require('jsonwebtoken');
const { randomUUID } = require('crypto');
const redis = require('../configs/redis');
const config = require('../configs/config');
const { loadPrivateKey, loadPublicKey } = require('../utils/keys');
const { TokenExpired, InvalidJsonWebToken } = require('../utils/exceptions/custom-exceptions');

const ACCESS_TOKEN_TTL = Number(config.app.JWT_ACCESS_TOKEN_TTL);
const REFRESH_TOKEN_TTL = Number(config.app.JWT_REFRESH_TOKEN_TTL);

const signAccessToken = ({ sub, email }) => {
    const jti = `jti-${randomUUID()}`;
    const token = jwt.sign(
        { jti, sub, email },
        loadPrivateKey(),
        {
            algorithm: 'RS256',
            expiresIn: ACCESS_TOKEN_TTL,
            keyid: config.app.JWT_KEY_ID,
            issuer: config.app.JWT_ISSUER,
            audience: config.app.JWT_AUDIENCE,
        }
    );
    return { token, jti, expiresIn: ACCESS_TOKEN_TTL };
};

const signRefreshToken = ({ sub }) => {
    const jti = `jti-${randomUUID()}`;
    const token = jwt.sign(
        { sub, jti },
        loadPrivateKey(),
        {
            algorithm: 'RS256',
            expiresIn: REFRESH_TOKEN_TTL,
            keyid: config.app.JWT_KEY_ID,
        }
    );
    return { token, jti, expiresIn: REFRESH_TOKEN_TTL };
};

const normalizeVerifyError = (err) => {
    if (err.name === 'TokenExpiredError') throw new TokenExpired();
    else if (err.name === 'JsonWebTokenError') throw new InvalidJsonWebToken();
    throw err;
};

const verifyAccessToken = (token) => {
    try {
        return jwt.verify(token, loadPublicKey(), {
            algorithms: ['RS256'],
            issuer: config.app.JWT_ISSUER,
            audience: config.app.JWT_AUDIENCE,
        });
    } catch (err) {
        normalizeVerifyError(err);
    }
};

const verifyRefreshToken = (token) => {
    try {
        return jwt.verify(token, loadPublicKey(), { algorithms: ['RS256'] });
    } catch (err) {
        normalizeVerifyError(err);
    }
};

const denylistToken = async ({ jti, ttlSeconds }) => {
    await redis.set(`denylist:${jti}`, '1', 'EX', ttlSeconds);
};

const isDenylisted = async (jti) => {
    const result = await redis.exists(`denylist:${jti}`);
    return result === 1;
};

module.exports = {
    signAccessToken,
    signRefreshToken,
    verifyAccessToken,
    verifyRefreshToken,
    denylistToken,
    isDenylisted,
};
