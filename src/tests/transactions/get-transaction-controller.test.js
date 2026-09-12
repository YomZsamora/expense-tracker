'use strict';

const request = require('supertest');
const app = require('../../index');
const { User } = require('../../models/user');
const { Category } = require('../../models/category');
const { Transaction } = require('../../models/transaction');
const tokenService = require('../../services/token-service');
const { faker } = require('@faker-js/faker');
const { getTransactionController } = require('../../app/controllers/transaction-controller');

describe('GET /v1/transactions/:id', () => {

    let user;
    let accessToken;
    let category;
    let transaction;
    let otherUser;
    let otherTransaction;

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
        category = await Category.create({
            userId: user.id,
            name: faker.word.noun(),
            type: 'expense',
            isDefault: false,
        });
        transaction = await Transaction.create({
            userId: user.id,
            categoryId: category.id,
            amount: 42.50,
            type: 'expense',
            date: '2025-01-15',
            description: 'Lunch at the office',
        });

        otherUser = await User.create({
            id: faker.string.uuid(),
            name: faker.person.fullName(),
            email: faker.internet.email(),
            passwordHash: 'irrelevant',
        });
        const otherCategory = await Category.create({
            userId: otherUser.id,
            name: faker.word.noun(),
            type: 'expense',
            isDefault: false,
        });
        otherTransaction = await Transaction.create({
            userId: otherUser.id,
            categoryId: otherCategory.id,
            amount: 10.00,
            type: 'expense',
            date: '2025-01-15',
            description: null,
        });
    });

    afterAll(async () => {
        await Transaction.destroy({ where: { userId: user.id }, force: true });
        await Transaction.destroy({ where: { userId: otherUser.id }, force: true });
        await Category.destroy({ where: { userId: user.id }, force: true });
        await Category.destroy({ where: { userId: otherUser.id }, force: true });
        await User.destroy({ where: { id: user.id }, force: true });
        await User.destroy({ where: { id: otherUser.id }, force: true });
    });

    it('should return 401 when no Authorization header is provided', async () => {
        const res = await request(app).get(`/v1/transactions/${transaction.id}`);

        expect(res.status).toBe(401);
        expect(res.body).toHaveProperty('status', 'error');
        expect(res.body).toHaveProperty('message', 'Authentication credentials were not provided.');
    });

    it('should return 404 when the transaction does not exist', async () => {
        const res = await request(app)
            .get(`/v1/transactions/${faker.string.uuid()}`)
            .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(404);
        expect(res.body).toHaveProperty('status', 'error');
        expect(res.body).toHaveProperty('message', 'Transaction not found.');
    });

    it('should return 403 when the transaction belongs to a different user', async () => {
        const res = await request(app)
            .get(`/v1/transactions/${otherTransaction.id}`)
            .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(403);
        expect(res.body).toHaveProperty('status', 'error');
        expect(res.body).toHaveProperty('message', "You don't have required permission to perform this action.");
    });

    it('should return 200 with the fully serialized transaction', async () => {
        const res = await request(app)
            .get(`/v1/transactions/${transaction.id}`)
            .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('status', 'success');
        expect(res.body).toHaveProperty('message', 'Transaction retrieved successfully.');

        const data = res.body.data;
        expect(data).toHaveProperty('transactionId', transaction.id);
        expect(data).toHaveProperty('amount', 42.50);
        expect(data).toHaveProperty('type', 'expense');
        expect(data).toHaveProperty('date', '2025-01-15');
        expect(data).toHaveProperty('description', 'Lunch at the office');
        expect(data).toHaveProperty('createdAt');
        expect(data).toHaveProperty('updatedAt');
        expect(data.category).toHaveProperty('categoryId', category.id);
        expect(data.category).toHaveProperty('name', category.name);
        expect(data).not.toHaveProperty('id');
        expect(data).not.toHaveProperty('userId');
    });

    it('should call next() with an error if any exception is thrown', async () => {
        const req = {};
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        const next = jest.fn();

        await getTransactionController(req, res, next);

        expect(next).toHaveBeenCalled();
    });
});
