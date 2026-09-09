'use strict';

const { verifyAccessToken, isDenylisted } = require('../../services/token-service');
const { NotAuthenticated } = require('../../utils/exceptions/custom-exceptions')

/** * Checks if the user is authenticated.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @param {Function} next - The next function.
 * @returns {Promise<void>} - A promise that resolves to the authenticated user.
 */
const isUserAuthenticated = async (req, res, next) => {

    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) return next(new NotAuthenticated());
        const token = authHeader.split(' ')[1];
        const payload = verifyAccessToken(token);
        if (await isDenylisted(payload.jti)) return next(new NotAuthenticated());
        req.user = payload;
        next();
    } catch (error) {
        next(error)
    }
}

module.exports = { isUserAuthenticated }
