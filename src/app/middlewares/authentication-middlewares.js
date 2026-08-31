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

const basicRegistrationMiddleware = [
    nameFieldValidator,
    emailFieldValidator,
    emailRegisteredValidator,
    registrationPasswordFieldValidator,
    passwordConfirmationFieldValidator,
    handleBadRequests('Error occurred during registration.'),
];

const basicLoginMiddleware = [
    emailFieldValidator,
    loginPasswordFieldValidator,
    handleBadRequests('Error occurred during login.'),
    emailExistsValidator,
    verifyPasswordValidator,
];

const refreshTokenMiddleware = [refreshTokenCookieValidator, refreshTokenExistsValidator];

module.exports = {
    basicRegistrationMiddleware,
    basicLoginMiddleware,
    refreshTokenMiddleware,
};
