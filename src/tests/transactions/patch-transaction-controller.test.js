'use strict';

const request = require('supertest');
const app = require('../../index');
const { faker } = require('@faker-js/faker');
const { User } = require('../../models/user');
const { Category } = require('../../models/category');
const { Transaction } = require('../../models/transaction');
const tokenService = require('../../services/token-service');
const { updateTransactionController } = require('../../app/controllers/transaction-controller');

describe('PATCH /v1/transactions/:id', () => {

    let user;
    let otherUser;
    let accessToken;
    let incomeCategory;
    let expenseCategory;
    let transaction;

    beforeAll(async () => {
        user = await User.create({
            id: faker.string.uuid(),
            name: faker.person.fullName(),
            email: faker.internet.email(),
            passwordHash: 'irrelevant',
        });
        otherUser = await User.create({
            id: faker.string.uuid(),
            name: faker.person.fullName(),
            email: faker.internet.email(),
            passwordHash: 'irrelevant',
        });
        ({ token: accessToken } = tokenService.signAccessToken({
            sub: user.id,
            email: user.email,
        }));
        incomeCategory = await Category.create({
            userId: user.id,
            name: 'Salary',
            type: 'income',
            isDefault: false,
        });
        expenseCategory = await Category.create({
            userId: user.id,
            name: 'Groceries',
            type: 'expense',
            isDefault: false,
        });
        transaction = await Transaction.create({
            userId: user.id,
            categoryId: expenseCategory.id,
            amount: 100.00,
            type: 'expense',
            date: '2026-01-15',
            description: 'Initial description',
        });
    });

    afterAll(async () => {
        await Transaction.destroy({ where: { userId: user.id }, force: true });
        await Category.destroy({ where: { userId: user.id }, force: true });
        await Category.destroy({ where: { userId: otherUser.id }, force: true });
        await User.destroy({ where: { id: user.id }, force: true });
        await User.destroy({ where: { id: otherUser.id }, force: true });
    });

    it('should return 401 when no Authorization header is provided', async () => {
        const res = await request(app).patch(`/v1/transactions/${transaction.id}`);
        expect(res.status).toBe(401);
        expect(res.body).toHaveProperty('status', 'error');
        expect(res.body).toHaveProperty('message', 'Authentication credentials were not provided.');
    });

    it('should return 400 when amount is invalid', async () => {
        const res = await request(app)
            .patch(`/v1/transactions/${transaction.id}`)
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ amount: -10 });
        
        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('status', 'error');
        expect(res.body).toHaveProperty('message', 'Error occurred while updating transaction.');
        expect(res.body.data).toHaveProperty('amount', 'Amount must be a positive number.');
    });

    it('should return 400 when amount has more than 2 decimal places', async () => {
        const res = await request(app)
            .patch(`/v1/transactions/${transaction.id}`)
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ amount: 10.123 });
        
        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('status', 'error');
        expect(res.body).toHaveProperty('message', 'Error occurred while updating transaction.');
        expect(res.body.data).toHaveProperty('amount', 'Amount cannot have more than 2 decimal places.');
    });

    it('should return 400 when type is invalid', async () => {
        const res = await request(app)
            .patch(`/v1/transactions/${transaction.id}`)
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ type: 'savings' });
        
        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('status', 'error');
        expect(res.body).toHaveProperty('message', 'Error occurred while updating transaction.');
        expect(res.body.data).toHaveProperty('type', 'Type must be income or expense.');
    });

    it('should return 400 when categoryId is not a valid UUID', async () => {
        const res = await request(app)
            .patch(`/v1/transactions/${transaction.id}`)
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ categoryId: 'not-a-uuid' });
        
        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('status', 'error');
        expect(res.body).toHaveProperty('message', 'Error occurred while updating transaction.');
        expect(res.body.data).toHaveProperty('categoryId', 'Category ID must be a valid UUID.');
    });

    it('should return 400 when date is not a valid ISO8601 date', async () => {
        const res = await request(app)
            .patch(`/v1/transactions/${transaction.id}`)
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ date: '15-01-2026' });
        
        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('status', 'error');
        expect(res.body).toHaveProperty('message', 'Error occurred while updating transaction.');
        expect(res.body.data).toHaveProperty('date', 'Date must be a valid date in YYYY-MM-DD format.');
    });

    it('should return 400 when description exceeds 500 characters', async () => {
        const res = await request(app)
            .patch(`/v1/transactions/${transaction.id}`)
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ description: 'a'.repeat(501) });
        
        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('status', 'error');
        expect(res.body).toHaveProperty('message', 'Error occurred while updating transaction.');
        expect(res.body.data).toHaveProperty('description', 'Description cannot exceed 500 characters.');
    });

    it('should return 404 when the transaction does not exist', async () => {
        const res = await request(app)
            .patch('/v1/transactions/00000000-0000-0000-0000-000000000000')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ amount: 50 });
    
        expect(res.status).toBe(404);
        expect(res.body).toHaveProperty('status', 'error');
        expect(res.body).toHaveProperty('message', 'Transaction could not found.');
    });

    it('should return 403 when the transaction belongs to a different user', async () => {
        const otherToken = tokenService.signAccessToken({
            sub: '00000000-0000-0000-0000-000000000099',
            email: 'other@test.local',
        }).token;
        const res = await request(app)
            .patch(`/v1/transactions/${transaction.id}`)
            .set('Authorization', `Bearer ${otherToken}`)
            .send({ amount: 50 });
        
        expect(res.status).toBe(403);
        expect(res.body).toHaveProperty('status', 'error');
        expect(res.body).toHaveProperty('message', "You don't have required permission to perform this action.");
    });

    it('should return 400 when the provided categoryId does not exist', async () => {
        const res = await request(app)
            .patch(`/v1/transactions/${transaction.id}`)
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ categoryId: '00000000-0000-0000-0000-000000000000' });
        
        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('status', 'error');
        expect(res.body.data).toHaveProperty('categoryId', 'Category not found.');
    });

    it('should return 400 when the provided categoryId belongs to a different user', async () => {
        const otherCategory = await Category.create({
            userId: otherUser.id,
            name: 'Other Expenses',
            type: 'expense',
            isDefault: false,
        });
        const res = await request(app)
            .patch(`/v1/transactions/${transaction.id}`)
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ categoryId: otherCategory.id });
        
        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('status', 'error');
        expect(res.body.data).toHaveProperty('categoryId', 'Category does not belong to you.');
    });

    it('should return 400 when type does not match the category type', async () => {
        const res = await request(app)
            .patch(`/v1/transactions/${transaction.id}`)
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ type: 'income' });
        
        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('status', 'error');
        expect(res.body).toHaveProperty('message', 'Validation failed.');
        expect(res.body.data).toHaveProperty('type', 'Transaction type must match the category type (expense).');
    });

    it('should return 400 when categoryId type conflicts with the transaction type', async () => {
        const res = await request(app)
            .patch(`/v1/transactions/${transaction.id}`)
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ categoryId: incomeCategory.id });
        
        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('status', 'error');
        expect(res.body).toHaveProperty('message', 'Validation failed.');
        expect(res.body.data).toHaveProperty('type', 'Transaction type must match the category type (income).');
    });

    it('should return 200 with the updated transaction when updating a single field', async () => {
        const res = await request(app)
            .patch(`/v1/transactions/${transaction.id}`)
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ 
                amount: 250.50,
                date: '2026-05-06',
                description: faker.lorem.sentence(1)
            });
        
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('status', 'success');
        expect(res.body).toHaveProperty('message', 'Transaction updated successfully.');
        expect(res.body.data).toMatchObject({
            amount: 250.50,
            type: 'expense'
        });

        expect(res.body.data).toHaveProperty('transactionId');
        expect(res.body.data).not.toHaveProperty('id');
        expect(res.body.data).not.toHaveProperty('deletedAt');
        expect(res.body.data.category).toMatchObject({ name: 'Groceries' });
    });

    it('should return 200 when updating type and categoryId together', async () => {
        const res = await request(app)
            .patch(`/v1/transactions/${transaction.id}`)
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ type: 'income', categoryId: incomeCategory.id });
        
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('status', 'success');
        expect(res.body.data).toMatchObject({
            type: 'income',
        });
        expect(res.body.data.category).toMatchObject({ name: 'Salary' });
    });

    it('should call next() with an error if any exception is thrown', async () => {
        const req = {};
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        const next = jest.fn();
        await updateTransactionController(req, res, next);
        expect(next).toHaveBeenCalled();
    });
});
