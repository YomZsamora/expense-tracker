'use strict';

const { isUserAuthenticated } = require("./authorization-middlewares");

/** * Retrieves a user by their ID.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @param {Function} next - The next function.
 * @returns {Promise<void>} - A promise that resolves to the retrieved user.
 */
const getUserMiddlewares = [ isUserAuthenticated ];

module.exports = { getUserMiddlewares }
