'use strict';

const { validationResult } = require('express-validator');
const userRepository = require('../../repositories/user-repository.js');
const refreshTokenRepository = require('../../repositories/refresh-token-repository.js');
const tokenService = require('../../services/token-service.js');
const authControllers = require('../../app/controllers/authentication-controllers.js');
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
} = require('../../utils/validators/auth-validators.js');
const {
    BadRequest,
    NotFound,
    NotAuthenticated,
    TokenReuseDetected,
    Conflict,
} = require('../../utils/exceptions/custom-exceptions.js');

jest.mock('../../repositories/user-repository.js', () => ({
    userEmailExists: jest.fn(),
    findUserByEmail: jest.fn(),
}));

jest.mock('../../repositories/refresh-token-repository.js', () => ({
    verifyJtiExists: jest.fn(),
}));

jest.mock('../../services/token-service.js', () => ({
    verifyRefreshToken: jest.fn(),
}));

jest.mock('../../app/controllers/authentication-controllers.js', () => ({
    clearRefreshCookie: jest.fn(),
}));

describe('nameFieldValidator', () => {

    const run = async (body) => {
        const req = { body };
        await nameFieldValidator.run(req);
        return validationResult(req);
    };

    it('should pass with a valid name', async () => {
        const result = await run({ name: 'John Doe' });
        expect(result.isEmpty()).toBe(true);
    });

    it('should fail if name is missing', async () => {
        const result = await run({ name: '' });
        expect(result.array()[0].msg).toBe('Name is required.');
    });

    it('should fail if name is shorter than 2 characters', async () => {
        const result = await run({ name: 'J' });
        expect(result.array()[0].msg).toBe('Name must be at least 2 characters long.');
    });

    it('should fail if name exceeds 100 characters', async () => {
        const result = await run({ name: 'A'.repeat(101) });
        expect(result.array()[0].msg).toBe('Name cannot exceed 100 characters.');
    });
});

describe('emailFieldValidator', () => {

    const run = async (body) => {
        const req = { body };
        await emailFieldValidator.run(req);
        return validationResult(req);
    };

    it('should pass with a valid email address', async () => {
        const result = await run({ email: 'user@example.com' });
        expect(result.isEmpty()).toBe(true);
    });

    it('should fail if the email is not a valid format', async () => {
        const result = await run({ email: 'not-an-email' });
        expect(result.array()[0].msg).toBe('Valid email address is required.');
    });

    it('should fail for a suspicious TLD (coom)', async () => {
        const result = await run({ email: 'user@example.coom' });
        expect(result.isEmpty()).toBe(false);
    });

    it('should fail for a suspicious TLD (con)', async () => {
        const result = await run({ email: 'user@example.con' });
        expect(result.isEmpty()).toBe(false);
    });

    it('should fail when the subdomain matches the main domain (e.g. com.com)', async () => {
        const result = await run({ email: 'user@com.com.com' });
        expect(result.isEmpty()).toBe(false);
    });
});


describe('emailRegisteredValidator', () => {
    
    let req, res, next;

    beforeEach(() => {
        req = { body: { email: 'new@example.com' } };
        res = {};
        next = jest.fn();
        jest.clearAllMocks();
    });

    it('should call next() if the email is not already registered', async () => {
        userRepository.userEmailExists.mockResolvedValue(false);
        await emailRegisteredValidator(req, res, next);
        expect(next).toHaveBeenCalledWith();
    });

    it('should call next(Conflict) if the email is already registered', async () => {
        userRepository.userEmailExists.mockResolvedValue(true);
        await emailRegisteredValidator(req, res, next);
        expect(next).toHaveBeenCalledWith(expect.any(Conflict));
    });

    it('should call next(error) if the repository throws', async () => {
        const error = new Error('DB error');
        userRepository.userEmailExists.mockRejectedValue(error);
        await emailRegisteredValidator(req, res, next);
        expect(next).toHaveBeenCalledWith(error);
    });
});

describe('registrationPasswordFieldValidator', () => {

    const run = async (body) => {
        const req = { body };
        await registrationPasswordFieldValidator.run(req);
        return validationResult(req);
    };

    it('should pass with a valid password', async () => {
        const result = await run({ password: 'Secure@1' });
        expect(result.isEmpty()).toBe(true);
    });

    it('should fail if password is missing', async () => {
        const result = await run({ password: '' });
        expect(result.array()[0].msg).toBe('Password is required.');
    });

    it('should fail if password is shorter than 6 characters', async () => {
        const result = await run({ password: 'Ab@1' });
        expect(result.array()[0].msg).toBe('Password must be at least 6 characters long.');
    });

    it('should fail if password exceeds 25 characters', async () => {
        const result = await run({ password: 'Secure@1' + 'x'.repeat(18) });
        expect(result.array()[0].msg).toBe('Password cannot exceed 25 characters.');
    });

    it('should fail if password has no digit', async () => {
        const result = await run({ password: 'Secure@!' });
        expect(result.array()[0].msg).toContain('one digit');
    });

    it('should fail if password has no lowercase letter', async () => {
        const result = await run({ password: 'SECURE@1' });
        expect(result.array()[0].msg).toContain('one lowercase letter');
    });

    it('should fail if password has no uppercase letter', async () => {
        const result = await run({ password: 'secure@1' });
        expect(result.array()[0].msg).toContain('one uppercase letter');
    });

    it('should fail if password has no special character', async () => {
        const result = await run({ password: 'Secure11' });
        expect(result.array()[0].msg).toContain('one special character');
    });
});

describe('passwordConfirmationFieldValidator', () => {

    const run = async (body) => {
        const req = { body };
        await passwordConfirmationFieldValidator.run(req);
        return validationResult(req);
    };

    it('should pass when passwordConfirm matches password', async () => {
        const result = await run({ password: 'Secure@1', passwordConfirm: 'Secure@1' });
        expect(result.isEmpty()).toBe(true);
    });

    it('should fail if passwordConfirm is missing', async () => {
        const result = await run({ password: 'Secure@1', passwordConfirm: '' });
        expect(result.array()[0].msg).toBe('Password confirmation is required.');
    });

    it('should fail if passwordConfirm does not match password', async () => {
        const result = await run({ password: 'Secure@1', passwordConfirm: 'Different@1' });
        expect(result.array()[0].msg).toBe('Passwords do not match.');
    });
});

describe('loginPasswordFieldValidator', () => {

    const run = async (body) => {
        const req = { body };
        await loginPasswordFieldValidator.run(req);
        return validationResult(req);
    };

    it('should pass when password is provided', async () => {
        const result = await run({ password: 'anyvalue' });
        expect(result.isEmpty()).toBe(true);
    });

    it('should fail if password is missing', async () => {
        const result = await run({ password: '' });
        expect(result.array()[0].msg).toBe('Password is required.');
    });
});

describe('emailExistsValidator', () => {
    
    let req, res, next;

    beforeEach(() => {
        req = { body: { email: 'user@example.com' } };
        res = {};
        next = jest.fn();
        jest.clearAllMocks();
    });

    it('should attach the user to req and call next() when the email is registered', async () => {
        const user = { id: 'user-abc', email: 'user@example.com' };
        userRepository.findUserByEmail.mockResolvedValue(user);
        await emailExistsValidator(req, res, next);
        expect(req.user).toBe(user);
        expect(next).toHaveBeenCalledWith();
    });

    it('should call next(NotFound) if the email is not registered', async () => {
        userRepository.findUserByEmail.mockResolvedValue(null);
        await emailExistsValidator(req, res, next);
        expect(next).toHaveBeenCalledWith(expect.any(NotFound));
    });
});

describe('verifyPasswordValidator', () => {
    
    let req, res, next;

    beforeEach(() => {
        req = { body: { password: 'Secure@1' }, user: { isValidPassword: jest.fn() } };
        res = {};
        next = jest.fn();
        jest.clearAllMocks();
    });

    it('should call next() when the password is correct', async () => {
        req.user.isValidPassword.mockReturnValue(true);
        await verifyPasswordValidator(req, res, next);
        expect(next).toHaveBeenCalledWith();
    });

    it('should call next(BadRequest) when the password is incorrect', async () => {
        req.user.isValidPassword.mockReturnValue(false);
        await verifyPasswordValidator(req, res, next);
        expect(next).toHaveBeenCalledWith(expect.any(BadRequest));
    });
});

describe('refreshTokenCookieValidator', () => {
    
    let req, res, next;

    beforeEach(() => {
        res = {};
        next = jest.fn();
    });

    it('should attach the token to req and call next() when the cookie is present', () => {
        req = { cookies: { refresh_token: 'some-token' } };
        refreshTokenCookieValidator(req, res, next);
        expect(req.refreshToken).toBe('some-token');
        expect(next).toHaveBeenCalledWith();
    });

    it('should call next(NotAuthenticated) if the refresh_token cookie is missing', () => {
        req = { cookies: {} };
        refreshTokenCookieValidator(req, res, next);
        expect(next).toHaveBeenCalledWith(expect.any(NotAuthenticated));
    });

    it('should call next(NotAuthenticated) if cookies are absent entirely', () => {
        req = {};
        refreshTokenCookieValidator(req, res, next);
        expect(next).toHaveBeenCalledWith(expect.any(NotAuthenticated));
    });
});

describe('refreshTokenExistsValidator', () => {
    
    let req, res, next;

    beforeEach(() => {
        req = { refreshToken: 'raw-token' };
        res = {};
        next = jest.fn();
        jest.clearAllMocks();
    });

    it('should attach the payload to req and call next() when the jti exists in the DB', async () => {
        const payload = { jti: 'valid-jti', sub: 'user-abc' };
        tokenService.verifyRefreshToken.mockReturnValue(payload);
        refreshTokenRepository.verifyJtiExists.mockResolvedValue(true);
        await refreshTokenExistsValidator(req, res, next);
        expect(req.payload).toBe(payload);
        expect(next).toHaveBeenCalledWith();
    });

    it('should clear the cookie and call next(TokenReuseDetected) when the jti is not in the DB', async () => {
        const payload = { jti: 'orphaned-jti', sub: 'user-abc' };
        tokenService.verifyRefreshToken.mockReturnValue(payload);
        refreshTokenRepository.verifyJtiExists.mockResolvedValue(false);
        await refreshTokenExistsValidator(req, res, next);
        expect(authControllers.clearRefreshCookie).toHaveBeenCalledWith(res);
        expect(next).toHaveBeenCalledWith(expect.any(TokenReuseDetected));
    });
});
