'use strict';

const request = require('supertest');
const app = require('../../index');
const { faker } = require('@faker-js/faker');
const { User } = require('../../models/user');
const { Category } = require('../../models/category');
const { Transaction } = require('../../models/transaction');
const { Budget } = require('../../models/budget');
const tokenService = require('../../services/token-service');
const { getMonthlySummaryController } = require('../../app/controllers/summary-controller');

describe('GET /v1/summary/monthly', () => {

    let user;
    let accessToken;
    let expenseCategory;
    let incomeCategory;

    const MONTH = 6;
    const YEAR = 2025;
    const DATE_IN_MONTH = '2025-06-15';

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
            name: 'Food',
            type: 'expense',
            isDefault: false,
        });
        incomeCategory = await Category.create({
            userId: user.id,
            name: 'Salary',
            type: 'income',
            isDefault: false,
        });
        // 2 expense transactions: 100 + 200 = 300
        await Transaction.create({
            userId: user.id,
            categoryId: expenseCategory.id,
            type: 'expense',
            amount: 100.00,
            description: 'Lunch',
            date: DATE_IN_MONTH,
        });
        await Transaction.create({
            userId: user.id,
            categoryId: expenseCategory.id,
            type: 'expense',
            amount: 200.00,
            description: 'Dinner',
            date: DATE_IN_MONTH,
        });
        // 1 income transaction: 1000
        await Transaction.create({
            userId: user.id,
            categoryId: incomeCategory.id,
            type: 'income',
            amount: 1000.00,
            description: 'Monthly salary',
            date: DATE_IN_MONTH,
        });
        // Budget for expense category
        await Budget.create({
            userId: user.id,
            categoryId: expenseCategory.id,
            amount: 500.00,
            month: MONTH,
            year: YEAR,
        });
    });

    afterAll(async () => {
        await Transaction.destroy({ where: { userId: user.id }, force: true });
        await Budget.destroy({ where: { userId: user.id } });
        await Category.destroy({ where: { userId: user.id }, force: true });
        await User.destroy({ where: { id: user.id }, force: true });
    });

    it('should return 401 when no Authorization header is provided', async () => {
        const res = await request(app).get('/v1/summary/monthly');
        expect(res.status).toBe(401);
    });

    it('should return 400 when month is not a valid integer', async () => {
        const res = await request(app)
            .get('/v1/summary/monthly?month=abc')
            .set('Authorization', `Bearer ${accessToken}`);
        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('status', 'error');
        expect(res.body).toHaveProperty('message', 'Error occurred while retrieving monthly summary.');
        expect(res.body.data).toHaveProperty('month', 'Month must be an integer between 1 and 12.');
    });

    it('should return 400 when month is below 1', async () => {
        const res = await request(app)
            .get('/v1/summary/monthly?month=0')
            .set('Authorization', `Bearer ${accessToken}`);
        expect(res.status).toBe(400);
        expect(res.body.data).toHaveProperty('month', 'Month must be an integer between 1 and 12.');
    });

    it('should return 400 when month is above 12', async () => {
        const res = await request(app)
            .get('/v1/summary/monthly?month=13')
            .set('Authorization', `Bearer ${accessToken}`);
        expect(res.status).toBe(400);
        expect(res.body.data).toHaveProperty('month', 'Month must be an integer between 1 and 12.');
    });

    it('should return 400 when year is below 2000', async () => {
        const res = await request(app)
            .get('/v1/summary/monthly?year=1999')
            .set('Authorization', `Bearer ${accessToken}`);
        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('message', 'Error occurred while retrieving monthly summary.');
        expect(res.body.data).toHaveProperty('year', 'Year must be 2000 or later.');
    });

    it('should return 200 with totals of 0 for a month with no transactions', async () => {
        const res = await request(app)
            .get('/v1/summary/monthly?month=1&year=2000')
            .set('Authorization', `Bearer ${accessToken}`);
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('status', 'success');
        expect(res.body).toHaveProperty('message', 'Monthly summary retrieved successfully.');
        expect(res.body.data.period).toEqual({ month: 1, year: 2000 });
        expect(res.body.data.totals).toEqual({ income: 0, expenses: 0, net: 0 });
        expect(res.body.data.categories).toHaveLength(0);
    });

    it('should return 200 with correct totals and category breakdown', async () => {
        const res = await request(app)
            .get(`/v1/summary/monthly?month=${MONTH}&year=${YEAR}`)
            .set('Authorization', `Bearer ${accessToken}`);
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('status', 'success');
        expect(res.body).toHaveProperty('message', 'Monthly summary retrieved successfully.');

        const { period, totals, categories } = res.body.data;

        expect(period).toEqual({ month: MONTH, year: YEAR });
        expect(totals.income).toBe(1000);
        expect(totals.expenses).toBe(300);
        expect(totals.net).toBe(700);

        expect(categories).toHaveLength(2);

        const expenseCat = categories.find((c) => c.categoryId === expenseCategory.id);
        expect(expenseCat).toBeDefined();
        expect(expenseCat.name).toBe('Food');
        expect(expenseCat.type).toBe('expense');
        expect(expenseCat.total).toBe(300);
        expect(expenseCat.count).toBe(2);
        expect(expenseCat.budget).not.toBeNull();
        expect(expenseCat.budget.limit).toBe(500);
        expect(expenseCat.budget.remaining).toBe(200);
        expect(expenseCat.budget.percentage).toBe(60);

        const incomeCat = categories.find((c) => c.categoryId === incomeCategory.id);
        expect(incomeCat).toBeDefined();
        expect(incomeCat.name).toBe('Salary');
        expect(incomeCat.type).toBe('income');
        expect(incomeCat.total).toBe(1000);
        expect(incomeCat.count).toBe(1);
        expect(incomeCat.budget).toBeNull();
    });

    it('should use current month and year when no query params are provided', async () => {
        const res = await request(app)
            .get('/v1/summary/monthly')
            .set('Authorization', `Bearer ${accessToken}`);
        expect(res.status).toBe(200);
        const now = new Date();
        expect(res.body.data.period).toEqual({
            month: now.getMonth() + 1,
            year: now.getFullYear(),
        });
    });

    it('should not include soft-deleted transactions in totals', async () => {
        const deletedTx = await Transaction.create({
            userId: user.id,
            categoryId: expenseCategory.id,
            type: 'expense',
            amount: 9999.00,
            description: 'Should be excluded',
            date: DATE_IN_MONTH,
        });
        await deletedTx.destroy();

        const res = await request(app)
            .get(`/v1/summary/monthly?month=${MONTH}&year=${YEAR}`)
            .set('Authorization', `Bearer ${accessToken}`);
        expect(res.status).toBe(200);

        const expenseCat = res.body.data.categories.find((c) => c.categoryId === expenseCategory.id);
        expect(expenseCat.total).toBe(300);
        expect(expenseCat.count).toBe(2);

        await deletedTx.destroy({ force: true });
    });

    it('should call next() with an error if any exception is thrown', async () => {
        const req = {};
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        const next = jest.fn();
        await getMonthlySummaryController(req, res, next);
        expect(next).toHaveBeenCalled();
    });
});
