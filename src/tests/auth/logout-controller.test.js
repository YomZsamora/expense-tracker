'use strict';

const request = require('supertest');
const app = require('../../index');
const { User } = require('../../models/user');
const { RefreshToken } = require('../../models/refresh-token');
const tokenService = require('../../services/token-service');
const refreshTokenRepository = require('../../repositories/refresh-token-repository');
const { logoutController } = require('../../app/controllers/auth-controllers');

const TEST_EMAIL = 'logouttest@test.local';
const TEST_PASSWORD = 'TestLogout@1';

describe('Logout API - POST /v1/auth/logout', () => {
    let logoutUser;

    beforeAll(async () => {
        logoutUser = await User.create({
            name: 'Logout Test',
            email: TEST_EMAIL,
            passwordHash: TEST_PASSWORD,
        });
    });

    afterAll(async () => {
        await RefreshToken.destroy({ where: { userId: logoutUser.id } });
        await User.destroy({ where: { id: logoutUser.id }, force: true });
    });

    describe('Success', () => {
        it('should return 200 with success message when no tokens are provided', async () => {
            const res = await request(app).post('/v1/auth/logout');

            expect(res.status).toBe(200);
            expect(res.body).toMatchObject({
                status: 'success',
                message: 'Logged out successfully.',
                data: null,
            });
        });

        it('should delete the refresh token DB record when a valid refresh_token cookie is provided', async () => {
            const { token, jti } = tokenService.signRefreshToken({ sub: logoutUser.id });
            await refreshTokenRepository.storeRefreshToken({
                jti,
                userId: logoutUser.id,
                ttlSeconds: 3600,
            });
            const res = await request(app)
                .post('/v1/auth/logout')
                .set('Cookie', `refresh_token=${token}`);
            expect(res.status).toBe(200);
            const record = await RefreshToken.findOne({ where: { jti } });
            expect(record).toBeNull();
        });

        it('should add the access token jti to the Redis denylist when a valid Bearer token is provided', async () => {
            const { token, jti } = tokenService.signAccessToken({
                sub: logoutUser.id,
                email: TEST_EMAIL,
            });
            const res = await request(app)
                .post('/v1/auth/logout')
                .set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(200);
            const denylisted = await tokenService.isDenylisted(jti);
            expect(denylisted).toBe(true);
        });
    });

    describe('Resilience', () => {
        it('should return 200 and silently ignore an invalid refresh_token cookie', async () => {
            const res = await request(app)
                .post('/v1/auth/logout')
                .set('Cookie', 'refresh_token=notavalidjwt');
            expect(res.status).toBe(200);
            expect(res.body).toMatchObject({
                status: 'success',
                message: 'Logged out successfully.',
            });
        });

        it('should return 200 and silently ignore an invalid Bearer access token', async () => {
            const res = await request(app)
                .post('/v1/auth/logout')
                .set('Authorization', 'Bearer notavalidjwt');
            expect(res.status).toBe(200);
            expect(res.body).toMatchObject({
                status: 'success',
                message: 'Logged out successfully.',
            });
        });
    });

    describe('Error propagation', () => {
        it('should call next() with an error if the controller throws', async () => {
            const req = { cookies: {}, headers: {} };
            const res = {}; // no clearCookie method → TypeError when clearRefreshCookie(res) is called
            const next = jest.fn();
            await logoutController(req, res, next);
            expect(next).toHaveBeenCalledWith(expect.any(Error));
        });
    });
});
