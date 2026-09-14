'use strict';

const request = require('supertest');
const app = require('../../index');
const { faker } = require('@faker-js/faker');
const { User } = require('../../models/user');
const { Category } = require('../../models/category');
const { Transaction } = require('../../models/transaction');
const tokenService = require('../../services/token-service');
const { getCategoryBreakdownController } = require('../../app/controllers/summary-controller');

describe('GET /v1/summary/categories', () => {

    let user;
    let accessToken;
    let expenseCategory;
    let incomeCategory;

    const START_DATE = '2025-06-01';
    const END_DATE = '2025-06-30';

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
        expenseCategory = await Category.create({
            userId: user.id,
            name: 'Utilities',
            type: 'expense',
            isDefault: false,
        });
        incomeCategory = await Category.create({
            userId: user.id,
            name: 'Consulting',
            type: 'income',
            isDefault: false,
        });
        await Transaction.create({
            userId: user.id,
            categoryId: expenseCategory.id,
            type: 'expense',
            amount: 150.00,
            description: 'Electric bill',
            date: '2025-06-10',
        });
        await Transaction.create({
            userId: user.id,
            categoryId: expenseCategory.id,
            type: 'expense',
            amount: 75.00,
            description: 'Water bill',
            date: '2025-06-20',
        });
        await Transaction.create({
            userId: user.id,
            categoryId: incomeCategory.id,
            type: 'income',
            amount: 3000.00,
            description: 'Consulting payment',
            date: '2025-06-15',
        });
        // Transaction outside the date range — should not appear
        await Transaction.create({
            userId: user.id,
            categoryId: expenseCategory.id,
            type: 'expense',
            amount: 9999.00,
            description: 'Outside range',
            date: '2025-07-01',
        });
    });

    afterAll(async () => {
        await Transaction.destroy({ where: { userId: user.id }, force: true });
        await Category.destroy({ where: { userId: user.id }, force: true });
        await User.destroy({ where: { id: user.id }, force: true });
    });

    it('should return 401 when no Authorization header is provided', async () => {
        const res = await request(app).get('/v1/summary/categories?startDate=2025-06-01&endDate=2025-06-30');
        expect(res.status).toBe(401);
    });

    it('should return 400 when startDate is missing', async () => {
        const res = await request(app)
            .get('/v1/summary/categories?endDate=2025-06-30')
            .set('Authorization', `Bearer ${accessToken}`);
        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('status', 'error');
        expect(res.body).toHaveProperty('message', 'Error occurred while retrieving category breakdown.');
        expect(res.body.data).toHaveProperty('startDate', 'Start date is required.');
    });

    it('should return 400 when endDate is missing', async () => {
        const res = await request(app)
            .get('/v1/summary/categories?startDate=2025-06-01')
            .set('Authorization', `Bearer ${accessToken}`);
        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('message', 'Error occurred while retrieving category breakdown.');
        expect(res.body.data).toHaveProperty('endDate', 'End date is required.');
    });

    it('should return 400 when startDate is not a valid date', async () => {
        const res = await request(app)
            .get('/v1/summary/categories?startDate=not-a-date&endDate=2025-06-30')
            .set('Authorization', `Bearer ${accessToken}`);
        expect(res.status).toBe(400);
        expect(res.body.data).toHaveProperty('startDate', 'Start date must be a valid date (YYYY-MM-DD).');
    });

    it('should return 400 when endDate is not a valid date', async () => {
        const res = await request(app)
            .get('/v1/summary/categories?startDate=2025-06-01&endDate=not-a-date')
            .set('Authorization', `Bearer ${accessToken}`);
        expect(res.status).toBe(400);
        expect(res.body.data).toHaveProperty('endDate', 'End date must be a valid date (YYYY-MM-DD).');
    });

    it('should return 400 when endDate is not after startDate', async () => {
        const res = await request(app)
            .get('/v1/summary/categories?startDate=2025-06-30&endDate=2025-06-01')
            .set('Authorization', `Bearer ${accessToken}`);
        expect(res.status).toBe(400);
        expect(res.body.data).toHaveProperty('endDate', 'End date must be after start date.');
    });

    it('should return 400 when date range exceeds 1 year', async () => {
        const res = await request(app)
            .get('/v1/summary/categories?startDate=2024-01-01&endDate=2025-12-31')
            .set('Authorization', `Bearer ${accessToken}`);
        expect(res.status).toBe(400);
        expect(res.body.data).toHaveProperty('endDate', 'Date range cannot exceed 1 year.');
    });

    it('should return 200 with correct category totals for the date range', async () => {
        const res = await request(app)
            .get(`/v1/summary/categories?startDate=${START_DATE}&endDate=${END_DATE}`)
            .set('Authorization', `Bearer ${accessToken}`);
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('status', 'success');
        expect(res.body).toHaveProperty('message', 'Category breakdown retrieved successfully.');

        const { period, totals, categories } = res.body.data;

        expect(period).toEqual({ startDate: START_DATE, endDate: END_DATE });
        expect(totals.income).toBe(3000);
        expect(totals.expenses).toBe(225);
        expect(totals.net).toBe(2775);

        expect(categories).toHaveLength(2);

        const expenseCat = categories.find((c) => c.categoryId === expenseCategory.id);
        expect(expenseCat).toBeDefined();
        expect(expenseCat.name).toBe('Utilities');
        expect(expenseCat.type).toBe('expense');
        expect(expenseCat.total).toBe(225);
        expect(expenseCat.count).toBe(2);

        const incomeCat = categories.find((c) => c.categoryId === incomeCategory.id);
        expect(incomeCat).toBeDefined();
        expect(incomeCat.name).toBe('Consulting');
        expect(incomeCat.type).toBe('income');
        expect(incomeCat.total).toBe(3000);
        expect(incomeCat.count).toBe(1);
    });

    it('should return empty categories array when no transactions exist in the date range', async () => {
        const res = await request(app)
            .get('/v1/summary/categories?startDate=2020-01-01&endDate=2020-12-31')
            .set('Authorization', `Bearer ${accessToken}`);
        expect(res.status).toBe(200);
        expect(res.body.data.categories).toHaveLength(0);
        expect(res.body.data.totals).toEqual({ income: 0, expenses: 0, net: 0 });
    });

    it('should not include transactions outside the date range', async () => {
        const res = await request(app)
            .get(`/v1/summary/categories?startDate=${START_DATE}&endDate=${END_DATE}`)
            .set('Authorization', `Bearer ${accessToken}`);
        const expenseCat = res.body.data.categories.find((c) => c.categoryId === expenseCategory.id);
        expect(expenseCat.total).toBe(225);
        expect(expenseCat.count).toBe(2);
    });

    it('should exclude soft-deleted transactions', async () => {
        const deletedTx = await Transaction.create({
            userId: user.id,
            categoryId: expenseCategory.id,
            type: 'expense',
            amount: 9999.00,
            description: 'Should be excluded',
            date: '2025-06-25',
        });
        await deletedTx.destroy();

        const res = await request(app)
            .get(`/v1/summary/categories?startDate=${START_DATE}&endDate=${END_DATE}`)
            .set('Authorization', `Bearer ${accessToken}`);
        const expenseCat = res.body.data.categories.find((c) => c.categoryId === expenseCategory.id);
        expect(expenseCat.total).toBe(225);

        await deletedTx.destroy({ force: true });
    });

    it('should call next() with an error if any exception is thrown', async () => {
        const req = {};
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        const next = jest.fn();
        await getCategoryBreakdownController(req, res, next);
        expect(next).toHaveBeenCalled();
    });
});
