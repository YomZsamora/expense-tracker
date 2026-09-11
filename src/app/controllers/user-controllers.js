'use strict';

const userRepository = require('../../repositories/user-repository');
const { NotFound } = require('../../utils/exceptions/custom-exceptions');
const { ApiResponse } = require('../../utils/responses');
const userSerializer = require('../../utils/serializers/user-serializer');
const tokenService = require('../../services/token-service');
const refreshTokenRepository = require('../../repositories/refresh-token-repository');
const { clearRefreshCookie } = require('./authentication-controllers');

/** * Retrieves a user by their ID.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @param {Function} next - The next function.
 * @returns {Promise<void>} - A promise that resolves to the retrieved user.
 */
const getUserController = async (req, res, next) => {
    try {
        const userId = req.user.sub;
        const user = await userRepository.findUserById(userId);
        if (!user) return next(new NotFound('The requested user could not be found.'));
        const apiResponse = new ApiResponse();
        apiResponse.message = 'User retrieved successfully.';
        apiResponse.data = userSerializer.serializeUser(user);
        return res.status(200).json(apiResponse);
    } catch (error) {
        next(error)
    }
}

/** * Logs out a user.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @param {Function} next - The next function.
 * @returns {Promise<void>} - A promise that resolves to the logged out user.
 */
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

module.exports = { getUserController, logoutController }
