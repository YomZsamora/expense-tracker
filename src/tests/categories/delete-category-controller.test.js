'use strict';

const request = require('supertest');
const app = require('../../index');
const { User } = require('../../models/user');
const { Category } = require('../../models/category');
const { Transaction } = require('../../models/transaction');
const tokenService = require('../../services/token-service');

const TEST_USER_ID = '00000000-0000-0000-0000-000000000010';
const TEST_EMAIL = 'categorytest@test.local';

describe('DELETE /v1/categories/:id', () => {
    
    let accessToken;
    let customCategory;
    let categoryToDelete;

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

        defaultCategory = await Category.create({
            userId: TEST_USER_ID,
            name: 'Test Default Category',
            type: 'income',
            isDefault: true,
        });
        
        categoryToDelete = await Category.create({
            userId: TEST_USER_ID,
            name: 'To Be Deleted',
            type: 'expense',
            isDefault: false,
        });
    });

    afterAll(async () => {
        await Transaction.destroy({ where: { userId: TEST_USER_ID }, force: true });
        await Category.destroy({ where: { userId: TEST_USER_ID }, force: true });
        await User.destroy({ where: { id: TEST_USER_ID }, force: true });
    });

    it('should return 401 when no Authorization header is provided', async () => {
        const res = await request(app).delete(`/v1/categories/${categoryToDelete.id}`);
        expect(res.status).toBe(401);
    });

    it('should return 403 when category belongs to a different user', async () => {
        const otherToken = tokenService.signAccessToken({
            sub: '00000000-0000-0000-0000-000000000099',
            email: 'other@test.local',
        }).token;

        const res = await request(app)
            .delete(`/v1/categories/${categoryToDelete.id}`)
            .set('Authorization', `Bearer ${otherToken}`);
        expect(res.status).toBe(403);
    });

    it('should return 404 when the category does not exist', async () => {
        const res = await request(app)
            .delete('/v1/categories/00000000-0000-0000-0000-000000000000')
            .set('Authorization', `Bearer ${accessToken}`);
        expect(res.status).toBe(404);
    });

    it('should return 403 when attempting to delete a default category', async () => {
        const res = await request(app)
            .delete(`/v1/categories/${defaultCategory.id}`)
            .set('Authorization', `Bearer ${accessToken}`);
        expect(res.status).toBe(403);
    });

    it('should return 409 when the category has active transactions', async () => {
        await Transaction.create({
            userId: TEST_USER_ID,
            categoryId: categoryToDelete.id,
            amount: 50.00,
            type: 'expense',
            date: new Date(),
        });

        const res = await request(app)
            .delete(`/v1/categories/${categoryToDelete.id}`)
            .set('Authorization', `Bearer ${accessToken}`);
        expect(res.status).toBe(409);
    });

    it('should return 200 and soft-delete the category', async () => {
        const fresh = await Category.create({
            userId: TEST_USER_ID,
            name: 'Fresh Delete Target',
            type: 'expense',
            isDefault: false,
        });

        const res = await request(app)
            .delete(`/v1/categories/${fresh.id}`)
            .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(200);
        expect(res.body.message).toBe('Category deleted successfully.');

        // Soft-deleted categories must not appear in the list
        const listRes = await request(app)
            .get('/v1/categories')
            .set('Authorization', `Bearer ${accessToken}`);
        const ids = listRes.body.data.map((c) => c.categoryId);
        expect(ids).not.toContain(fresh.id);
    });
});
