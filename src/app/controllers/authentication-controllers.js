'use strict';

const { ApiResponse } = require('../../utils/responses');
const userRepository = require('../../repositories/user-repository');
const refreshTokenRepository = require('../../repositories/refresh-token-repository');
const categoryRepository = require('../../repositories/category-repository');
const userSerializer = require('../../utils/serializers/user-serializer');
const tokenService = require('../../services/token-service');
const { NotFound } = require('../../utils/exceptions/custom-exceptions');
const sequelize = require('../../configs/sequelize');

const config = require('../../configs/config');
const REFRESH_TOKEN_TTL = Number(config.app.JWT_REFRESH_TOKEN_TTL);

const setRefreshCookie = (res, token) => {
    res.cookie('refresh_token', token, {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        path: '/v1/auth/refresh',
        maxAge: REFRESH_TOKEN_TTL * 1000,
    });
};

const clearRefreshCookie = (res) => {
    res.clearCookie('refresh_token', {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        path: '/v1/auth/refresh',
    });
};

const basicRegistrationController = async (req, res, next) => {
    try {
        const { name, email, password } = req.body;
        const { user, accessToken, expiresIn, refreshToken } = await sequelize.transaction(async (t) => {
            const newUser = await userRepository.registerUser( { name, email, password }, { transaction: t } );
            await categoryRepository.seedDefaultCategories(newUser.id, { transaction: t });
            const { token: accessToken, expiresIn } = tokenService.signAccessToken({
                sub: newUser.id, 
                email: newUser.email,
            });
            const { token: refreshToken, jti } = tokenService.signRefreshToken({
                sub: newUser.id,
            });
            await refreshTokenRepository.storeRefreshToken({
                jti, 
                userId: newUser.id, 
                ttlSeconds: REFRESH_TOKEN_TTL,
            }, { transaction: t });
            return { user: newUser, accessToken, expiresIn, refreshToken };
        });
        setRefreshCookie(res, refreshToken);
        const apiResponse = new ApiResponse();
        apiResponse.message = 'New user account created successfully.';
        apiResponse.data = {
            user: userSerializer.serializeAuthUser(user),
            accessToken,
            tokenType: 'Bearer',
            expiresIn,
        };
        return res.status(201).json(apiResponse);
    } catch (error) {
        next(error);
    }
};

const basicLoginController = async (req, res, next) => {
    try {
        const user = req.user;
        const { token: accessToken, expiresIn } = tokenService.signAccessToken({
            sub: user.id,
            email: user.email,
        });
        const { token: refreshToken, jti } = tokenService.signRefreshToken({ sub: user.id });
        await refreshTokenRepository.revokeAllUserSessions(user.id);
        await refreshTokenRepository.storeRefreshToken({
            jti,
            userId: user.id,
            ttlSeconds: REFRESH_TOKEN_TTL,
        });
        setRefreshCookie(res, refreshToken);
        const apiResponse = new ApiResponse();
        apiResponse.message = 'Logged in successfully.';
        apiResponse.data = { accessToken, tokenType: 'Bearer', expiresIn };
        return res.status(200).json(apiResponse);
    } catch (error) {
        next(error);
    }
};

const refreshTokenController = async (req, res, next) => {
    try {
        const { sub, jti } = req.payload;
        const user = await userRepository.findUserById(sub);
        if (!user)
            throw new NotFound('User account not found. Please check your credentials and try again.');
        await refreshTokenRepository.deleteByJti(jti);
        const { token: accessToken, expiresIn } = tokenService.signAccessToken({
            sub,
            email: user.email,
        });
        const { token: refreshToken, jti: newJti } = tokenService.signRefreshToken({ sub });
        await refreshTokenRepository.storeRefreshToken({
            jti: newJti,
            userId: sub,
            ttlSeconds: REFRESH_TOKEN_TTL,
        });
        setRefreshCookie(res, refreshToken);
        const apiResponse = new ApiResponse();
        apiResponse.message = 'Token refreshed successfully.';
        apiResponse.data = { accessToken, tokenType: 'Bearer', expiresIn };
        return res.status(200).json(apiResponse);
    } catch (error) {
        next(error);
    }
};

const logoutController = async (req, res, next) => {
    try {
        const refreshToken = req.cookies?.refresh_token;
        if (refreshToken) {
            try {
                const payload = tokenService.verifyRefreshToken(refreshToken);
                await refreshTokenRepository.deleteByJti(payload.jti);
            } catch (_) {
                // token is invalid or already expired — nothing to revoke
            }
        }
        const remainingTtl = req.user.exp - Math.floor(Date.now() / 1000);
        if (remainingTtl > 0) {
            await tokenService.denylistToken({ jti: req.user.jti, ttlSeconds: remainingTtl });
        }
        clearRefreshCookie(res);
        const apiResponse = new ApiResponse();
        apiResponse.message = 'Logged out successfully.';
        return res.status(200).json(apiResponse);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    basicRegistrationController,
    basicLoginController,
    refreshTokenController,
    logoutController,
    setRefreshCookie,
    clearRefreshCookie,
};
