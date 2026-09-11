'use strict';

const request = require('supertest');
const app = require('../../index');
const { User } = require('../../models/user');
const tokenService = require('../../services/token-service');

const TEST_USER_ID = '00000000-0000-0000-0000-000000000010';
const TEST_EMAIL = 'categorytest@test.local';

describe('POST /v1/categories', () => {

    let accessToken;

    beforeAll(async () => {
        await User.create({
            id: TEST_USER_ID,
            name: 'Category Test User',
            email: TEST_EMAIL,
            passwordHash: 'irrelevant',
        });

        ({ token: accessToken } = tokenService.signAccessToken({
            sub: TEST_USER_ID,
            email: TEST_EMAIL,
        }));
    });

    afterAll(async () => {
        await User.destroy({ where: { id: TEST_USER_ID }, force: true });
    });

    it('should return 401 when no Authorization header is provided', async () => {
        const res = await request(app)
            .post('/v1/categories')
            .send({ name: 'Groceries', type: 'expense' });
        expect(res.status).toBe(401);
    });

    it('should return 400 when name is missing', async () => {
        const res = await request(app)
            .post('/v1/categories')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ type: 'expense' });
        expect(res.status).toBe(400);
        expect(res.body.data).toHaveProperty('name');
    });

    it('should return 400 when type is missing', async () => {
        const res = await request(app)
            .post('/v1/categories')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ name: 'Groceries' });
        expect(res.status).toBe(400);
        expect(res.body.data).toHaveProperty('type');
    });

    it('should return 400 when type is not income or expense', async () => {
        const res = await request(app)
            .post('/v1/categories')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ name: 'Groceries', type: 'savings' });
        expect(res.status).toBe(400);
        expect(res.body.data).toHaveProperty('type');
    });

    it('should return 201 with the created category', async () => {
        const res = await request(app)
            .post('/v1/categories')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ name: 'Side Projects', type: 'income' });

        expect(res.status).toBe(201);
        expect(res.body.data).toMatchObject({
            name: 'Side Projects',
            type: 'income',
            isDefault: false,
        });
        expect(res.body.data).toHaveProperty('categoryId');
    });

    it('should return 409 when a category with the same name and type already exists', async () => {
        const res = await request(app)
            .post('/v1/categories')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ name: 'Side Projects', type: 'income' });
        expect(res.status).toBe(409);
    });
});
