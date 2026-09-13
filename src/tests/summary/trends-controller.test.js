'use strict';

const request = require('supertest');
const app = require('../../index');
const { faker } = require('@faker-js/faker');
const { User } = require('../../models/user');
const { Category } = require('../../models/category');
const { Transaction } = require('../../models/transaction');
const tokenService = require('../../services/token-service');
const { getMonthlyTrendsController } = require('../../app/controllers/summary-controller');

describe('GET /v1/summary/trends', () => {

    let user;
    let accessToken;
    let expenseCategory;
    let incomeCategory;

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const toDateStr = (year, month, day) =>
        `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    const prevMonth = (offsetMonths) => {
        const d = new Date(now.getFullYear(), now.getMonth() - offsetMonths, 1);
        return { month: d.getMonth() + 1, year: d.getFullYear() };
    };

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
            name: 'Rent',
            type: 'expense',
            isDefault: false,
        });
        incomeCategory = await Category.create({
            userId: user.id,
            name: 'Freelance',
            type: 'income',
            isDefault: false,
        });

        const { month: m1, year: y1 } = prevMonth(1);
        const { month: m0, year: y0 } = prevMonth(0);

        await Transaction.create({
            userId: user.id,
            categoryId: expenseCategory.id,
            type: 'expense',
            amount: 500.00,
            description: 'Last month expense',
            date: toDateStr(y1, m1, 10),
        });
        await Transaction.create({
            userId: user.id,
            categoryId: incomeCategory.id,
            type: 'income',
            amount: 2000.00,
            description: 'Last month income',
            date: toDateStr(y1, m1, 15),
        });
        await Transaction.create({
            userId: user.id,
            categoryId: expenseCategory.id,
            type: 'expense',
            amount: 300.00,
            description: 'Current month expense',
            date: toDateStr(y0, m0, 5),
        });
    });

    afterAll(async () => {
        await Transaction.destroy({ where: { userId: user.id }, force: true });
        await Category.destroy({ where: { userId: user.id }, force: true });
        await User.destroy({ where: { id: user.id }, force: true });
    });

    it('should return 401 when no Authorization header is provided', async () => {
        const res = await request(app).get('/v1/summary/trends');
        expect(res.status).toBe(401);
    });

    it('should return 400 when months is not a valid integer', async () => {
        const res = await request(app)
            .get('/v1/summary/trends?months=abc')
            .set('Authorization', `Bearer ${accessToken}`);
        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('status', 'error');
        expect(res.body).toHaveProperty('message', 'Error occurred while retrieving monthly trends.');
        expect(res.body.data).toHaveProperty('months', 'Months must be an integer between 1 and 12.');
    });

    it('should return 400 when months is below 1', async () => {
        const res = await request(app)
            .get('/v1/summary/trends?months=0')
            .set('Authorization', `Bearer ${accessToken}`);
        expect(res.status).toBe(400);
        expect(res.body.data).toHaveProperty('months', 'Months must be an integer between 1 and 12.');
    });

    it('should return 400 when months is above 12', async () => {
        const res = await request(app)
            .get('/v1/summary/trends?months=13')
            .set('Authorization', `Bearer ${accessToken}`);
        expect(res.status).toBe(400);
        expect(res.body.data).toHaveProperty('months', 'Months must be an integer between 1 and 12.');
    });

    it('should return 200 with 6 entries by default', async () => {
        const res = await request(app)
            .get('/v1/summary/trends')
            .set('Authorization', `Bearer ${accessToken}`);
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('status', 'success');
        expect(res.body).toHaveProperty('message', 'Monthly trends retrieved successfully.');
        expect(res.body.data.months).toBe(6);
        expect(res.body.data.trends).toHaveLength(6);
    });

    it('should return 200 with 12 entries when months=12', async () => {
        const res = await request(app)
            .get('/v1/summary/trends?months=12')
            .set('Authorization', `Bearer ${accessToken}`);
        expect(res.status).toBe(200);
        expect(res.body.data.months).toBe(12);
        expect(res.body.data.trends).toHaveLength(12);
    });

    it('should return trends ordered newest last', async () => {
        const res = await request(app)
            .get('/v1/summary/trends?months=6')
            .set('Authorization', `Bearer ${accessToken}`);
        expect(res.status).toBe(200);
        const trends = res.body.data.trends;
        const last = trends[trends.length - 1];
        expect(last.period).toEqual({ month: currentMonth, year: currentYear });
    });

    it('should include correct totals for months that have transactions', async () => {
        const res = await request(app)
            .get('/v1/summary/trends?months=6')
            .set('Authorization', `Bearer ${accessToken}`);
        expect(res.status).toBe(200);
        const trends = res.body.data.trends;

        const { month: m1, year: y1 } = prevMonth(1);
        const lastMonthEntry = trends.find((t) => t.period.month === m1 && t.period.year === y1);
        expect(lastMonthEntry).toBeDefined();
        expect(lastMonthEntry.totals.income).toBe(2000);
        expect(lastMonthEntry.totals.expenses).toBe(500);
        expect(lastMonthEntry.totals.net).toBe(1500);

        const currentMonthEntry = trends[trends.length - 1];
        expect(currentMonthEntry.totals.expenses).toBe(300);
        expect(currentMonthEntry.totals.income).toBe(0);
        expect(currentMonthEntry.totals.net).toBe(-300);
    });

    it('should show zeros for months with no transactions', async () => {
        const res = await request(app)
            .get('/v1/summary/trends?months=6')
            .set('Authorization', `Bearer ${accessToken}`);
        expect(res.status).toBe(200);
        const trends = res.body.data.trends;
        const emptyMonths = trends.slice(0, -2);
        emptyMonths.forEach((entry) => {
            expect(entry.totals).toEqual({ income: 0, expenses: 0, net: 0 });
        });
    });

    it('should exclude soft-deleted transactions from trends', async () => {
        const { month: m0, year: y0 } = prevMonth(0);
        const deletedTx = await Transaction.create({
            userId: user.id,
            categoryId: expenseCategory.id,
            type: 'expense',
            amount: 9999.00,
            description: 'Should be excluded',
            date: toDateStr(y0, m0, 20),
        });
        await deletedTx.destroy();

        const res = await request(app)
            .get('/v1/summary/trends?months=6')
            .set('Authorization', `Bearer ${accessToken}`);
        const currentMonthEntry = res.body.data.trends[res.body.data.trends.length - 1];
        expect(currentMonthEntry.totals.expenses).toBe(300);

        await deletedTx.destroy({ force: true });
    });

    it('should call next() with an error if any exception is thrown', async () => {
        const req = {};
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        const next = jest.fn();
        await getMonthlyTrendsController(req, res, next);
        expect(next).toHaveBeenCalled();
    });
});
