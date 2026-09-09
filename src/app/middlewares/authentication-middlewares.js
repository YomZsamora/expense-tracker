'use strict';

const { handleBadRequests } = require('../../utils/exceptions/exception-handler');
const {
    nameFieldValidator,
    emailFieldValidator,
    emailRegisteredValidator,
    registrationPasswordFieldValidator,
    passwordConfirmationFieldValidator,
    loginPasswordFieldValidator,
    emailExistsValidator,
    verifyPasswordValidator,
    refreshTokenCookieValidator,
    refreshTokenExistsValidator,
} = require('../../utils/validators/auth-validators');

/** * Validates the name, email, password, and password confirmation fields for basic registration.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @param {Function} next - The next function.
 * @returns {Promise<void>} - A promise that resolves to the validated fields.
 */
const basicRegistrationMiddleware = [
    nameFieldValidator,
    emailFieldValidator,
    registrationPasswordFieldValidator,
    passwordConfirmationFieldValidator,
    handleBadRequests('Error occurred during registration.'),
    emailRegisteredValidator,
];

/** * Validates the email and password fields for basic login.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @param {Function} next - The next function.
 * @returns {Promise<void>} - A promise that resolves to the validated fields.
 */
const basicLoginMiddleware = [
    emailFieldValidator,
    loginPasswordFieldValidator,
    handleBadRequests('Error occurred during login.'),
    emailExistsValidator,
    verifyPasswordValidator,
];

/** * Validates the refresh token cookie and checks if it exists.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @param {Function} next - The next function.
 * @returns {Promise<void>} - A promise that resolves to the validated fields.
 */
const refreshTokenMiddleware = [refreshTokenCookieValidator, refreshTokenExistsValidator];

module.exports = {
    basicRegistrationMiddleware,
    basicLoginMiddleware,
    refreshTokenMiddleware,
};
