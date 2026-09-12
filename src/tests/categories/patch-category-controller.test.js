'use strict';

const request = require('supertest');
const app = require('../../index');
const { faker } = require('@faker-js/faker');
const { User } = require('../../models/user');
const { Category } = require('../../models/category');
const { Transaction } = require('../../models/transaction');
const tokenService = require('../../services/token-service');

describe('PATCH /v1/categories/:id', () => {

    let user;
    let accessToken;
    let customCategory;

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
        customCategory = await Category.create({
            userId: user.id,
            name: 'Test Custom Category',
            type: 'expense',
            isDefault: false,
        });
    });

    afterAll(async () => {
        await Transaction.destroy({ where: { userId: user.id }, force: true });
        await Category.destroy({ where: { userId: user.id }, force: true });
    });
    
    it('should return 401 when no Authorization header is provided', async () => {
        const res = await request(app)
            .patch(`/v1/categories/${customCategory.id}`)
            .send({ name: 'Updated Name' });
        
        expect(res.status).toBe(401);
        expect(res.body).toHaveProperty('status', 'error');
        expect(res.body).toHaveProperty('message', 'Authentication credentials were not provided.');
    });

    it('should return 400 when name is missing', async () => {
        const res = await request(app)
            .patch(`/v1/categories/${customCategory.id}`)
            .set('Authorization', `Bearer ${accessToken}`)
            .send({});
        
        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('status', 'error');
        expect(res.body).toHaveProperty('message', 'Error occurred while updating category.');

        expect(res.body).toHaveProperty('data');
        expect(res.body.data.name).toEqual('Name is required.');
    });

    it('should return 400 when name is too short', async () => {
        const res = await request(app)
            .patch(`/v1/categories/${customCategory.id}`)
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ name: 'X' });
        
        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('status', 'error');
        expect(res.body).toHaveProperty('message', 'Error occurred while updating category.');

        expect(res.body).toHaveProperty('data');
        expect(res.body.data.name).toEqual('Name must be at least 2 characters.');
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
        expect(res.body).toHaveProperty('status', 'error');
        expect(res.body).toHaveProperty('message', "You don't have required permission to perform this action.");
    });

    it('should return 404 when the category does not exist', async () => {
        const res = await request(app)
            .patch('/v1/categories/00000000-0000-0000-0000-000000000000')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ name: 'Updated Name' });
        
            expect(res.status).toBe(404);
            expect(res.body).toHaveProperty('status', 'error');
            expect(res.body).toHaveProperty('message', "The requested category could not found.");
    });

    it('should return 200 with the updated category', async () => {
        const res = await request(app)
            .patch(`/v1/categories/${customCategory.id}`)
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ name: 'Updated Custom Category' });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('status', 'success');
        expect(res.body).toHaveProperty('message', 'Category updated successfully.');
        expect(res.body.data).toMatchObject({
            categoryId: customCategory.id,
            name: 'Updated Custom Category',
            type: 'expense',
        });
    });
});
