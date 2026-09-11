'use strict';

const request = require('supertest');
const app = require('../../index');
const { User } = require('../../models/user');
const { Category } = require('../../models/category');
const tokenService = require('../../services/token-service');
const { listCategoriesController } = require('../../app/controllers/category-controller');

const TEST_USER_ID = '00000000-0000-0000-0000-000000000010';
const TEST_EMAIL = 'categorytest@test.local';

describe('GET /v1/categories', () => {

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
        const res = await request(app).get('/v1/categories/');
        expect(res.status).toBe(401);
    });

    it('should return 200 with the list of categories for the authenticated user', async () => {
        const res = await request(app)
            .get('/v1/categories')
            .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('success');
        expect(Array.isArray(res.body.data)).toBe(true);

        const item = res.body.data[0];
        expect(item).toHaveProperty('categoryId');
        expect(item).toHaveProperty('name');
        expect(item).toHaveProperty('type');
        expect(item).toHaveProperty('isDefault');
        expect(item).toHaveProperty('createdAt');
        expect(item).toHaveProperty('updatedAt');
    });

    it('should not return categories belonging to a different user', async () => {
        const otherToken = tokenService.signAccessToken({
            sub: '00000000-0000-0000-0000-000000000099',
            email: 'other@test.local',
        }).token;

        const res = await request(app)
            .get('/v1/categories')
            .set('Authorization', `Bearer ${otherToken}`);

        expect(res.status).toBe(200);
        const ids = res.body.data.map((c) => c.categoryId);
        expect(ids).not.toContain(customCategory.id);
    });

    it('should call next() with an error if listCategoriesController throws', async () => {
        const req = {}; // req.user is undefined → TypeError on req.user.sub
        const res = {};
        const next = jest.fn();
        await listCategoriesController(req, res, next);
        expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
});
