'use strict';

const request = require('supertest');
const app = require('../../index');
const { User } = require('../../models/user');
const { Category } = require('../../models/category');
const { Transaction } = require('../../models/transaction');
const tokenService = require('../../services/token-service');
const { faker } = require('@faker-js/faker');

describe('POST /v1/categories', () => {

    let user;
    let accessToken;
    let categoryToAdd;

    beforeAll(async () => {
        categoryToAdd = { name: 'Side Projects', type: 'income' };
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
    });

    afterAll(async () => {
        await Transaction.destroy({ where: { userId: user.id }, force: true });
        await Category.destroy({ where: { userId: user.id }, force: true });
    });

    it('should return 401 when no Authorization header is provided', async () => {
        const res = await request(app)
            .post('/v1/categories')
            .send({ name: 'Groceries', type: 'expense' });
        
        expect(res.status).toBe(401);
        expect(res.body).toHaveProperty('status', 'error');
        expect(res.body).toHaveProperty('message', 'Authentication credentials were not provided.');
    });

    it('should return 400 when name is missing', async () => {
        const res = await request(app)
            .post('/v1/categories')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ type: 'expense' });
        
        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('status', 'error');
        expect(res.body).toHaveProperty('message', 'Error occurred while creating category.');

        expect(res.body).toHaveProperty('data');
        expect(res.body.data.name).toEqual('Name is required.');
    });

    it('should return 400 when name is less than 2 characters', async () => {
        const res = await request(app)
            .post('/v1/categories')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ name: 'a' });
        
        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('status', 'error');
        expect(res.body).toHaveProperty('message', 'Error occurred while creating category.');

        expect(res.body).toHaveProperty('data');
        expect(res.body.data.name).toEqual('Name must be at least 2 characters.');
    });

    it('should return 400 when type is missing', async () => {
        const res = await request(app)
            .post('/v1/categories')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ name: 'Groceries' });
        
        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('status', 'error');
        expect(res.body).toHaveProperty('message', 'Error occurred while creating category.');

        expect(res.body).toHaveProperty('data');
        expect(res.body.data.type).toEqual('Type is required.');
    });

    it('should return 400 when type is not income or expense', async () => {
        const res = await request(app)
            .post('/v1/categories')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ name: 'Groceries', type: 'savings' });
        
        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('status', 'error');
        expect(res.body).toHaveProperty('message', 'Error occurred while creating category.');

        expect(res.body).toHaveProperty('data');
        expect(res.body.data.type).toEqual('Type must be income or expense.');
    });

    it('should return 201 with the created category', async () => {
        const res = await request(app)
            .post('/v1/categories')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ name: categoryToAdd.name, type: categoryToAdd.type });

        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty('status', 'success');
        expect(res.body).toHaveProperty('message', 'Category created successfully.');
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
            .send({ name: categoryToAdd.name, type: categoryToAdd.type });
        
        expect(res.status).toBe(409);
        expect(res.body).toHaveProperty('status', 'error');
        expect(res.body).toHaveProperty('message', `A ${categoryToAdd.type} category named "${categoryToAdd.name}" already exists.`);
    });
});
