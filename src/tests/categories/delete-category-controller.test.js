'use strict';

const request = require('supertest');
const app = require('../../index');
const { faker } = require('@faker-js/faker');
const { User } = require('../../models/user');
const { Category } = require('../../models/category');
const { Transaction } = require('../../models/transaction');
const tokenService = require('../../services/token-service');

describe('DELETE /v1/categories/:id', () => {
    
    let user;
    let defaultCategory;
    let accessToken;
    let categoryToDelete;

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
        defaultCategory = await Category.create({
            userId: user.id,
            name: 'Test Delete Category',
            type: 'income',
            isDefault: true,
        });
        categoryToDelete = await Category.create({
            userId: user.id,
            name: 'To Be Deleted',
            type: 'expense',
            isDefault: false,
        });
    });

    afterAll(async () => {
        await Transaction.destroy({ where: { userId: user.id }, force: true });
        await Category.destroy({ where: { userId: user.id }, force: true });
    });

    it('should return 401 when no Authorization header is provided', async () => {
        const res = await request(app).delete(`/v1/categories/${categoryToDelete.id}`);
        expect(res.status).toBe(401);
        expect(res.body).toHaveProperty('status', 'error');
        expect(res.body).toHaveProperty('message', 'Authentication credentials were not provided.');
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
        expect(res.body).toHaveProperty('status', 'error');
        expect(res.body).toHaveProperty('message', "You don't have required permission to perform this action.");
    });

    it('should return 404 when the category does not exist', async () => {
        const res = await request(app)
            .delete('/v1/categories/00000000-0000-0000-0000-000000000000')
            .set('Authorization', `Bearer ${accessToken}`);
        
        expect(res.status).toBe(404);
        expect(res.body).toHaveProperty('status', 'error');
        expect(res.body).toHaveProperty('message', "The requested category could not found.");
    });

    it('should return 403 when attempting to delete a default category', async () => {
        const res = await request(app)
            .delete(`/v1/categories/${defaultCategory.id}`)
            .set('Authorization', `Bearer ${accessToken}`);
        
        expect(res.status).toBe(403);
        expect(res.body).toHaveProperty('status', 'error');
        expect(res.body).toHaveProperty('message', "You don't have required permission to perform this action.");
    });

    it('should return 409 when the category has active transactions', async () => {
        await Transaction.create({
            userId: user.id,
            categoryId: categoryToDelete.id,
            amount: 50.00,
            type: 'expense',
            date: new Date(),
        });
        const res = await request(app)
            .delete(`/v1/categories/${categoryToDelete.id}`)
            .set('Authorization', `Bearer ${accessToken}`);
        
        expect(res.status).toBe(409);
        expect(res.body).toHaveProperty('status', 'error');
        expect(res.body).toHaveProperty('message', "Cannot delete a category with active transactions.");
    });

    it('should return 200 and soft-delete the category', async () => {
        const fresh = await Category.create({
            userId: user.id,
            name: 'Fresh Delete Target',
            type: 'expense',
            isDefault: false,
        });
        const res = await request(app)
            .delete(`/v1/categories/${fresh.id}`)
            .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(204);
        const listRes = await request(app)
            .get('/v1/categories')
            .set('Authorization', `Bearer ${accessToken}`);
        const ids = listRes.body.data.map((c) => c.categoryId);
        expect(ids).not.toContain(fresh.id);
    });
});
