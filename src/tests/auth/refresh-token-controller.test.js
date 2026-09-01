'use strict';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../index');
const { User } = require('../../models/user');
const { RefreshToken } = require('../../models/refresh-token');
const tokenService = require('../../services/token-service');
const { loadPrivateKey } = require('../../utils/keys');
const { refreshTokenController } = require('../../app/controllers/authentication-controllers.js');

const TEST_EMAIL = 'refreshtest@test.local';
const TEST_PASSWORD = 'TestRefresh@1';

describe('Refresh Token API - POST /v1/auth/refresh', () => {
    let refreshUser;
    let validCookie;
    let orphanedCookie;
    let expiredCookie;

    beforeAll(async () => {
        refreshUser = await User.create({
            name: 'Refresh Test',
            email: TEST_EMAIL,
            passwordHash: TEST_PASSWORD,
        });

        const loginRes = await request(app)
            .post('/v1/auth/login')
            .send({ email: TEST_EMAIL, password: TEST_PASSWORD });

        validCookie = loginRes.headers['set-cookie'][0].split(';')[0];

        const { token: orphanedToken } = tokenService.signRefreshToken({ sub: refreshUser.id });
        orphanedCookie = `refresh_token=${orphanedToken}`;

        const expiredToken = jwt.sign(
            { sub: refreshUser.id, jti: 'test-expired-jti' },
            loadPrivateKey(),
            { algorithm: 'RS256', expiresIn: -1 }
        );
        expiredCookie = `refresh_token=${expiredToken}`;
    });

    afterAll(async () => {
        await RefreshToken.destroy({ where: { userId: refreshUser.id } });
        await User.destroy({ where: { id: refreshUser.id }, force: true });
    });

    describe('Authentication', () => {
        it('should return 401 if no refresh_token cookie is provided', async () => {
            const res = await request(app).post('/v1/auth/refresh');

            expect(res.status).toBe(401);
            expect(res.body).toMatchObject({
                status: 'error',
                message: 'Authentication credentials were not provided.',
            });
        });
    });

    describe('Validation', () => {
        it('should return 401 if the refresh_token cookie is not a valid JWT', async () => {
            const res = await request(app)
                .post('/v1/auth/refresh')
                .set('Cookie', 'refresh_token=notavalidtoken');

            expect(res.status).toBe(401);
            expect(res.body).toMatchObject({
                status: 'error',
                message: 'Provided token is invalid.',
            });
        });

        it('should return 401 if the refresh_token JWT is expired', async () => {
            const res = await request(app)
                .post('/v1/auth/refresh')
                .set('Cookie', expiredCookie);

            expect(res.status).toBe(401);
            expect(res.body).toMatchObject({
                status: 'error',
                message: 'Token has expired.',
            });
        });
    });

    describe('Success', () => {
        it('should return 200, a new access token, and a rotated refresh_token cookie', async () => {
            const res = await request(app)
                .post('/v1/auth/refresh')
                .set('Cookie', validCookie);

            expect(res.status).toBe(200);
            expect(res.body).toMatchObject({
                status: 'success',
                message: 'Token refreshed successfully.',
            });

            const { data } = res.body;
            expect(typeof data.accessToken).toBe('string');
            expect(data.accessToken.length).toBeGreaterThan(0);
            expect(data.tokenType).toBe('Bearer');
            expect(typeof data.expiresIn).toBe('number');

            const setCookieHeader = res.headers['set-cookie'];
            expect(setCookieHeader).toBeDefined();
            const refreshCookie = setCookieHeader.find((c) => c.startsWith('refresh_token='));
            expect(refreshCookie).toBeDefined();
            expect(refreshCookie).toContain('HttpOnly');
            expect(refreshCookie).toContain('Path=/v1/auth/refresh');
        });
    });

    describe('Token reuse', () => {
        it('should return 401 and revoke all sessions when the refresh token is not in the DB', async () => {
            const res = await request(app)
                .post('/v1/auth/refresh')
                .set('Cookie', orphanedCookie);

            expect(res.status).toBe(401);
            expect(res.body).toMatchObject({
                status: 'error',
                message: 'Token reuse detected. All sessions have been revoked.',
            });
        });
    });

    describe('Error propagation', () => {
        it('should call next() with an error if the controller throws', async () => {
            const req = { payload: {} };
            const res = {};
            const next = jest.fn();

            await refreshTokenController(req, res, next);

            expect(next).toHaveBeenCalledWith(expect.any(Error));
        });
    });
});
