'use strict';

const request = require('supertest');
const app = require('../../index');
const { faker } = require('@faker-js/faker');
const { User } = require('../../models/user');
const tokenService = require('../../services/token-service');
const { getUserController } = require('../../app/controllers/user-controllers');

describe('GET /v1/users/', () => {
    
    let user;
    let accessToken;
    let nonExistentAccessToken;

    beforeAll(async () => {
        user = await User.create({
            id: faker.string.uuid(),
            name: faker.person.fullName(),
            email: faker.internet.email(),
            passwordHash: 'irrelevant',
        });
        ({ token: accessToken } = tokenService.signAccessToken({
            sub: user.id,
            email: user.email,
        }));
        ({ token: nonExistentAccessToken } = tokenService.signAccessToken({
            sub: faker.string.uuid(),
            email: faker.internet.email(),
        }));
    });

    afterAll(async () => {
        await User.destroy({ where: { id: user.id }, force: true });
    });

    it('should return 401 when no Authorization header is provided', async () => {
        const res = await request(app).get(`/v1/users/me`);
        expect(res.status).toBe(401);
        expect(res.body).toHaveProperty('status', 'error');
        expect(res.body).toHaveProperty('message', 'Authentication credentials were not provided.');
    });

    it('should return 404 when the category does not exist', async () => {
        const res = await request(app)
            .get('/v1/users/me')
            .set('Authorization', `Bearer ${nonExistentAccessToken}`);
        console.log(res.body);
        expect(res.status).toBe(404);
        expect(res.body).toHaveProperty('status', 'error');
        expect(res.body).toHaveProperty('message', "The requested user could not be found.");
    });

    it('should successfully allow authorized users to fetch their profiles', async () => {
        const res = await request(app)
            .get(`/v1/users/me`)
            .set('Authorization', `Bearer ${accessToken}`);
        
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('status', 'success');
        expect(res.body).toHaveProperty('message', "User retrieved successfully.");
        expect(res.body).toHaveProperty('data');

        const profileData = res.body.data;
        expect(profileData).toHaveProperty('userId', user.id);
        expect(profileData).toHaveProperty('name',user.name);
        expect(profileData).toHaveProperty('email', user.email);
    });

    it('should call next() with an error if any exception is thrown', async () => {
        req = {};
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        next = jest.fn();
        await getUserController(req, res, next);
        expect(next).toHaveBeenCalled();
    });
    
});
