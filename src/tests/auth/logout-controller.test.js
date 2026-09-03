'use strict';

const request = require('supertest');
const app = require('../../index');
const { User } = require('../../models/user');
const { RefreshToken } = require('../../models/refresh-token');
const tokenService = require('../../services/token-service');
const refreshTokenRepository = require('../../repositories/refresh-token-repository');
const { logoutController } = require('../../app/controllers/authentication-controllers.js');

const TEST_USER_ID = '00000000-0000-0000-0000-000000000099';
const TEST_EMAIL = 'logouttest@test.local';
const TEST_PASSWORD = 'TestLogout@1';

describe('Logout API - POST /v1/auth/logout', () => {
    let logoutUser;

    beforeAll(async () => {
        logoutUser = await User.create({
            id: TEST_USER_ID,
            name: 'Logout Test',
            email: TEST_EMAIL,
            passwordHash: TEST_PASSWORD,
        });
    });

    afterAll(async () => {
        await RefreshToken.destroy({ where: { userId: TEST_USER_ID } });
        await User.destroy({ where: { id: TEST_USER_ID }, force: true });
    });

    describe('Authentication', () => {
        it('should return 401 when no Authorization header is provided', async () => {
            const res = await request(app).post('/v1/auth/logout');
            expect(res.status).toBe(401);
        });

        it('should return 401 when an invalid Bearer token is provided', async () => {
            const res = await request(app)
                .post('/v1/auth/logout')
                .set('Authorization', 'Bearer notavalidjwt');
            expect(res.status).toBe(401);
        });
    });

    describe('Success', () => {
        it('should return 200 and denylist the access token jti in Redis', async () => {
            const { token, jti } = tokenService.signAccessToken({
                sub: logoutUser.id,
                email: TEST_EMAIL,
            });
            const res = await request(app)
                .post('/v1/auth/logout')
                .set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(200);
            expect(res.body).toMatchObject({
                status: 'success',
                message: 'Logged out successfully.',
            });
            const denylisted = await tokenService.isDenylisted(jti);
            expect(denylisted).toBe(true);
        });

        it('should delete the refresh token DB record when a valid refresh_token cookie is provided', async () => {
            const { token: accessToken } = tokenService.signAccessToken({
                sub: logoutUser.id,
                email: TEST_EMAIL,
            });
            const { token: refreshToken, jti } = tokenService.signRefreshToken({ sub: logoutUser.id });
            await refreshTokenRepository.storeRefreshToken({
                jti,
                userId: logoutUser.id,
                ttlSeconds: 3600,
            });
            const res = await request(app)
                .post('/v1/auth/logout')
                .set('Authorization', `Bearer ${accessToken}`)
                .set('Cookie', `refresh_token=${refreshToken}`);
            expect(res.status).toBe(200);
            const record = await RefreshToken.findOne({ where: { jti } });
            expect(record).toBeNull();
        });
    });

    describe('Resilience', () => {
        it('should return 200 and silently ignore an invalid refresh_token cookie', async () => {
            const { token: accessToken } = tokenService.signAccessToken({
                sub: logoutUser.id,
                email: TEST_EMAIL,
            });
            const res = await request(app)
                .post('/v1/auth/logout')
                .set('Authorization', `Bearer ${accessToken}`)
                .set('Cookie', 'refresh_token=notavalidjwt');
            expect(res.status).toBe(200);
            expect(res.body).toMatchObject({
                status: 'success',
                message: 'Logged out successfully.',
            });
        });
    });

    describe('Error propagation', () => {
        it('should call next() with an error if the controller throws', async () => {
            const req = {
                cookies: {},
                headers: {},
                user: {
                    jti: 'test-jti',
                    exp: Math.floor(Date.now() / 1000) - 10, // already expired — skips denylist
                },
            };
            const res = {}; // no clearCookie method → TypeError when clearRefreshCookie(res) is called
            const next = jest.fn();
            await logoutController(req, res, next);
            expect(next).toHaveBeenCalledWith(expect.any(Error));
        });
    });
});
