'use strict';

const request = require('supertest');
const app = require('../../index');
const { User } = require('../../models/user');
const { Category } = require('../../models/category');
const tokenService = require('../../services/token-service');

const TEST_USER_ID = '00000000-0000-0000-0000-000000000010';
const TEST_EMAIL = 'categorytest@test.local';

describe('PATCH /v1/categories/:id', () => {

    let accessToken;
    let customCategory;

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

        customCategory = await Category.create({
            userId: TEST_USER_ID,
            name: 'Test Custom Category',
            type: 'expense',
            isDefault: false,
        });
    });

    afterAll(async () => {
        await Category.destroy({ where: { userId: TEST_USER_ID }, force: true });
        await User.destroy({ where: { id: TEST_USER_ID }, force: true });
    });
    
    it('should return 401 when no Authorization header is provided', async () => {
        const res = await request(app)
            .patch(`/v1/categories/${customCategory.id}`)
            .send({ name: 'Updated Name' });
        expect(res.status).toBe(401);
    });

    it('should return 400 when name is missing', async () => {
        const res = await request(app)
            .patch(`/v1/categories/${customCategory.id}`)
            .set('Authorization', `Bearer ${accessToken}`)
            .send({});
        expect(res.status).toBe(400);
        expect(res.body.data).toHaveProperty('name');
    });

    it('should return 400 when name is too short', async () => {
        const res = await request(app)
            .patch(`/v1/categories/${customCategory.id}`)
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ name: 'X' });
        expect(res.status).toBe(400);
        expect(res.body.data).toHaveProperty('name');
    });

    it('should return 403 when category belongs to a different user', async () => {
        const otherToken = tokenService.signAccessToken({
            sub: '00000000-0000-0000-0000-000000000099',
            email: 'other@test.local',
        }).token;

        const res = await request(app)
            .patch(`/v1/categories/${customCategory.id}`)
            .set('Authorization', `Bearer ${otherToken}`)
            .send({ name: 'Hijacked Name' });
        expect(res.status).toBe(403);
    });

    it('should return 404 when the category does not exist', async () => {
        const res = await request(app)
            .patch('/v1/categories/00000000-0000-0000-0000-000000000000')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ name: 'Updated Name' });
        expect(res.status).toBe(404);
    });

    it('should return 200 with the updated category', async () => {
        const res = await request(app)
            .patch(`/v1/categories/${customCategory.id}`)
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ name: 'Updated Custom Category' });

        expect(res.status).toBe(200);
        expect(res.body.data).toMatchObject({
            categoryId: customCategory.id,
            name: 'Updated Custom Category',
            type: 'expense',
        });
    });
});