const { body } = require('express-validator');
const { BadRequest, NotFound, NotAuthenticated, TokenReuseDetected, Conflict } = require('../exceptions/custom-exceptions');
const userRepository = require('../../repositories/user-repository');
const refreshTokenRepository = require('../../repositories/refresh-token-repository');
const { verifyRefreshToken } = require('../../services/token-service');
const { clearRefreshCookie } = require('../../app/controllers/auth-controllers');

const nameFieldValidator = body('name')
    .not()
    .isEmpty()
    .withMessage('Name is required.')
    .isLength({ min: 2 })
    .withMessage('Name must be at least 2 characters long.')
    .isLength({ max: 100 })
    .withMessage('Name cannot exceed 100 characters.');

const emailFieldValidator = body('email')
    .isEmail({
        allow_display_name: false,
        allow_utf8_local_part: true,
        require_tld: true,
        allow_ip_domain: false,
        domain_specific_validation: true,
    })
    .withMessage('Valid email address is required.')
    .custom((email) => {
        const suspiciousTLDs = ['coom', 'con', 'cm', 'cmo', 'comm', 'om', 'ocm'];
        const domain = email.split('@')[1];
        const tld = domain.split('.').pop().toLowerCase();
        if (suspiciousTLDs.includes(tld)) throw new BadRequest('Valid email address is required.');

        const domainParts = domain.split('.');
        if (domainParts.length > 2) {
            const [subdomain, mainDomain] = domainParts;
            if (subdomain === mainDomain) throw new BadRequest('Valid email address is required.');
        }

        return true;
    });

const emailRegisteredValidator = async (req, res, next) => {
    try {
        const exists = await userRepository.userEmailExists(req.body?.email);
        if (exists) return next(new Conflict(`${req.body.email} is already in use. Please choose a different email.`));
        next();
    } catch (error) {
        next(error);
    }
};

const registrationPasswordFieldValidator = body('password')
    .not()
    .isEmpty()
    .withMessage('Password is required.')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long.')
    .isLength({ max: 25 })
    .withMessage('Password cannot exceed 25 characters.')
    .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=[\]{}|;:,.<>?]).{6,}$/)
    .withMessage(
        'Password must contain at least one digit, one lowercase letter, one uppercase letter, and one special character.'
    );

const passwordConfirmationFieldValidator = body('passwordConfirm')
    .not()
    .isEmpty()
    .withMessage('Password confirmation is required.')
    .custom((passwordConfirm, { req }) => {
        if (passwordConfirm !== req.body.password) throw new BadRequest('Passwords do not match.');
        return true;
    });

const loginPasswordFieldValidator = body('password')
    .not()
    .isEmpty()
    .withMessage('Password is required.');

const emailExistsValidator = (req, res, next) => {
    return body('email').custom(async (email, { req }) => {
        const user = await userRepository.findUserByEmail(email);
        if (!user)
            return next(
                new NotFound('User account not found. Please check your email and try again.')
            );
        req.user = user;
        return true;
    })(req, res, next);
};

const verifyPasswordValidator = (req, res, next) => {
    return body('password').custom((password, { req }) => {
        const user = req.user;
        if (!user.isValidPassword(password))
            return next(new BadRequest('Invalid password. Please try again.'));
        return true;
    })(req, res, next);
};

const refreshTokenCookieValidator = (req, res, next) => {
    const token = req.cookies?.refresh_token;
    if (!token) return next(new NotAuthenticated());
    req.refreshToken = token;
    next();
};

const refreshTokenExistsValidator = async (req, res, next) => {
    const payload = verifyRefreshToken(req.refreshToken);
    const { jti } = payload;
    const exists = await refreshTokenRepository.verifyJtiExists(jti);
    if (!exists) {
        clearRefreshCookie(res);
        return next(new TokenReuseDetected());
    }
    req.payload = payload;
    next();
};

module.exports = {
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
};
