'use strict';

const request = require('supertest');
const app = require('../../index');
const { User } = require('../../models/user');
const { Category } = require('../../models/category');
const { Transaction } = require('../../models/transaction');
const tokenService = require('../../services/token-service');
const { faker } = require('@faker-js/faker');
const { deleteTransactionController } = require('../../app/controllers/transaction-controller');

describe('DELETE /v1/transactions/:id', () => {

    let user;
    let otherUser;
    let accessToken;
    let transaction;
    let transactionCategory;

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
        otherUser = await User.create({
            id: faker.string.uuid(),
            name: faker.person.fullName(),
            email: faker.internet.email(),
            passwordHash: 'irrelevant',
        });
        transactionCategory = await Category.create({
            userId: user.id,
            name: faker.word.noun(),
            type: 'expense',
            isDefault: true,
        });
        transaction = await Transaction.create({
            userId: user.id,
            categoryId: transactionCategory.id,
            amount: 42.50,
            type: 'expense',
            date: '2025-01-15',
            description: 'Lunch at the office',
        });
    });

    beforeEach(() => {
        transactionPayload = {
            amount: faker.commerce.price(),
            type: "expense",
            categoryId: transactionCategory.id,
            date: faker.date.recent(),
            description: faker.lorem.sentence(5)
        }
    });

    afterAll(async () => {
        await Transaction.destroy({ where: { userId: user.id }, force: true });
        await Category.destroy({ where: { userId: user.id }, force: true });
    });

    it('should return 401 when no Authorization header is provided', async () => {
        const res = await request(app)
            .delete(`/v1/transactions/${transaction.id}`)
            .send(transactionPayload);
        
        expect(res.status).toBe(401);
        expect(res.body).toHaveProperty('status', 'error');
        expect(res.body).toHaveProperty('message', 'Authentication credentials were not provided.');
    });

    it('should return 404 when the transaction does not exist', async () => {
        const res = await request(app)
            .delete(`/v1/transactions/${faker.string.uuid()}`)
            .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(404);
        expect(res.body).toHaveProperty('status', 'error');
        expect(res.body).toHaveProperty('message', 'Transaction could not found.');
    });

    it('should return 400 when the provided transaction belongs to a different user', async () => {
        const otherCategory = await Category.create({
            userId: otherUser.id,
            name: faker.word.noun(),
            type: 'expense',
            isDefault: true,
        });
        const otherTransaction = await Transaction.create({
            userId: otherUser.id,
            categoryId: otherCategory.id,
            amount: faker.commerce.price(),
            type: 'expense',
            date: faker.date.recent(),
            description: faker.lorem.sentence(5),
        });
        const res = await request(app)
            .delete(`/v1/transactions/${otherTransaction.id}`)
            .set('Authorization', `Bearer ${accessToken}`)
            .send(transactionPayload);
        
        expect(res.status).toBe(403);
        expect(res.body).toHaveProperty('status', 'error');
        expect(res.body).toHaveProperty('message', "You don't have required permission to perform this action.");
    });

    it('should call next() with an error if any exception is thrown', async () => {
        req = {};
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        next = jest.fn();
        await deleteTransactionController(req, res, next);
        expect(next).toHaveBeenCalled();
    });
});
