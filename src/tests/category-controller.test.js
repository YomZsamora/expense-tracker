'use strict';

const request = require('supertest');
const app = require('../index');
const { User } = require('../models/user');
const { Category } = require('../models/category');
const { Transaction } = require('../models/transaction');
const tokenService = require('../services/token-service');
const { listCategoriesController } = require('../app/controllers/category-controller');

const TEST_USER_ID = '00000000-0000-0000-0000-000000000010';
const TEST_EMAIL = 'categorytest@test.local';

describe('Category API', () => {
    let accessToken;
    let customCategory;
    let defaultCategory;

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

        defaultCategory = await Category.create({
            userId: TEST_USER_ID,
            name: 'Test Default Category',
            type: 'income',
            isDefault: true,
        });
    });

    afterAll(async () => {
        await Transaction.destroy({ where: { userId: TEST_USER_ID }, force: true });
        await Category.destroy({ where: { userId: TEST_USER_ID }, force: true });
        await User.destroy({ where: { id: TEST_USER_ID }, force: true });
    });

    // ─── GET /v1/categories ────────────────────────────────────────────────
    describe('GET /v1/categories', () => {
        describe('Authentication', () => {
            it('should return 401 when no Authorization header is provided', async () => {
                const res = await request(app).get('/v1/categories');
                expect(res.status).toBe(401);
            });
        });

        describe('Success', () => {
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
        });
    });

    // ─── POST /v1/categories ───────────────────────────────────────────────
    describe('POST /v1/categories', () => {
        describe('Authentication', () => {
            it('should return 401 when no Authorization header is provided', async () => {
                const res = await request(app)
                    .post('/v1/categories')
                    .send({ name: 'Groceries', type: 'expense' });
                expect(res.status).toBe(401);
            });
        });

        describe('Validation', () => {
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
        });

        describe('Success', () => {
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
        });

        describe('Conflict', () => {
            it('should return 409 when a category with the same name and type already exists', async () => {
                const res = await request(app)
                    .post('/v1/categories')
                    .set('Authorization', `Bearer ${accessToken}`)
                    .send({ name: 'Test Custom Category', type: 'expense' });
                expect(res.status).toBe(409);
            });
        });
    });

    // ─── PATCH /v1/categories/:id ──────────────────────────────────────────
    describe('PATCH /v1/categories/:id', () => {
        describe('Authentication', () => {
            it('should return 401 when no Authorization header is provided', async () => {
                const res = await request(app)
                    .patch(`/v1/categories/${customCategory.id}`)
                    .send({ name: 'Updated Name' });
                expect(res.status).toBe(401);
            });
        });

        describe('Validation', () => {
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
        });

        describe('Authorization', () => {
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
        });

        describe('Success', () => {
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
    });

    // ─── DELETE /v1/categories/:id ─────────────────────────────────────────
    describe('DELETE /v1/categories/:id', () => {
        let categoryToDelete;

        beforeAll(async () => {
            categoryToDelete = await Category.create({
                userId: TEST_USER_ID,
                name: 'To Be Deleted',
                type: 'expense',
                isDefault: false,
            });
        });

        describe('Authentication', () => {
            it('should return 401 when no Authorization header is provided', async () => {
                const res = await request(app).delete(`/v1/categories/${categoryToDelete.id}`);
                expect(res.status).toBe(401);
            });
        });

        describe('Authorization', () => {
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
        });

        describe('Business rules', () => {
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
        });

        describe('Success', () => {
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
    });

    // ─── Error propagation ─────────────────────────────────────────────────
    describe('Error propagation', () => {
        it('should call next() with an error if listCategoriesController throws', async () => {
            const req = {}; // req.user is undefined → TypeError on req.user.sub
            const res = {};
            const next = jest.fn();
            await listCategoriesController(req, res, next);
            expect(next).toHaveBeenCalledWith(expect.any(Error));
        });
    });
});
