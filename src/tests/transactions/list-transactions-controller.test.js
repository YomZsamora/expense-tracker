'use strict';

const request = require('supertest');
const app = require('../../index');
const { faker } = require('@faker-js/faker');
const { User } = require('../../models/user');
const { Category } = require('../../models/category');
const { Transaction } = require('../../models/transaction');
const tokenService = require('../../services/token-service');
const { listTransactionsController } = require('../../app/controllers/transaction-controller');

describe('GET /v1/transactions', () => {

    let user;
    let accessToken;
    let incomeCategory;
    let expenseCategory;

    // Seeded transactions (created in beforeAll, never mutated):
    // - income1: amount=500,  date='2026-03-01', description='Monthly salary'
    // - income2: amount=150,  date='2026-03-15', description='Freelance payment'
    // - expense1: amount=80,  date='2026-03-05', description='Supermarket run'
    // - expense2: amount=200, date='2026-02-20', description='Electricity bill'
    // - expense3: amount=45,  date='2026-03-10', description='Coffee subscription'
    let income1, income2, expense1, expense2, expense3;

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
        [income1, income2, expense1, expense2, expense3] = await Transaction.bulkCreate([
            { userId: user.id, categoryId: incomeCategory.id,  amount: 500,  type: 'income',  date: '2026-03-01', description: 'Monthly salary' },
            { userId: user.id, categoryId: incomeCategory.id,  amount: 150,  type: 'income',  date: '2026-03-15', description: 'Freelance payment' },
            { userId: user.id, categoryId: expenseCategory.id, amount: 80,   type: 'expense', date: '2026-03-05', description: 'Supermarket run' },
            { userId: user.id, categoryId: expenseCategory.id, amount: 200,  type: 'expense', date: '2026-02-20', description: 'Electricity bill' },
            { userId: user.id, categoryId: expenseCategory.id, amount: 45,   type: 'expense', date: '2026-03-10', description: 'Coffee subscription' },
        ]);
    });

    afterAll(async () => {
        await Transaction.destroy({ where: { userId: user.id }, force: true });
        await Category.destroy({ where: { userId: user.id }, force: true });
        await User.destroy({ where: { id: user.id }, force: true });
    });

    // ─── Authentication ───────────────────────────────────────────────────────

    it('should return 401 when no Authorization header is provided', async () => {
        const res = await request(app).get('/v1/transactions');
        expect(res.status).toBe(401);
        expect(res.body).toHaveProperty('status', 'error');
        expect(res.body).toHaveProperty('message', 'Authentication credentials were not provided.');
    });

    // ─── Validation ───────────────────────────────────────────────────────────

    it('should return 400 when type is invalid', async () => {
        const res = await request(app)
            .get('/v1/transactions')
            .set('Authorization', `Bearer ${accessToken}`)
            .query({ type: 'savings' });
        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('status', 'error');
        expect(res.body).toHaveProperty('message', 'Error occurred while retrieving transactions.');
        expect(res.body.data).toHaveProperty('type', 'Type must be income or expense.');
    });

    it('should return 400 when categoryId is not a valid UUID', async () => {
        const res = await request(app)
            .get('/v1/transactions')
            .set('Authorization', `Bearer ${accessToken}`)
            .query({ categoryId: 'not-a-uuid' });
        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('status', 'error');
        expect(res.body).toHaveProperty('message', 'Error occurred while retrieving transactions.');
        expect(res.body.data).toHaveProperty('categoryId', 'Category ID must be a valid UUID.');
    });

    it('should return 400 when startDate is not a valid date', async () => {
        const res = await request(app)
            .get('/v1/transactions')
            .set('Authorization', `Bearer ${accessToken}`)
            .query({ startDate: '01-03-2026' });
        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('status', 'error');
        expect(res.body).toHaveProperty('message', 'Error occurred while retrieving transactions.');
        expect(res.body.data).toHaveProperty('startDate', 'Start date must be a valid YYYY-MM-DD date.');
    });

    it('should return 400 when endDate is not a valid date', async () => {
        const res = await request(app)
            .get('/v1/transactions')
            .set('Authorization', `Bearer ${accessToken}`)
            .query({ endDate: 'tomorrow' });
        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('status', 'error');
        expect(res.body).toHaveProperty('message', 'Error occurred while retrieving transactions.');
        expect(res.body.data).toHaveProperty('endDate', 'End date must be a valid YYYY-MM-DD date.');
    });

    it('should return 400 when page is not a positive integer', async () => {
        const res = await request(app)
            .get('/v1/transactions')
            .set('Authorization', `Bearer ${accessToken}`)
            .query({ page: 0 });
        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('status', 'error');
        expect(res.body).toHaveProperty('message', 'Error occurred while retrieving transactions.');
        expect(res.body.data).toHaveProperty('page', 'Page must be a positive integer.');
    });

    it('should return 400 when limit exceeds 100', async () => {
        const res = await request(app)
            .get('/v1/transactions')
            .set('Authorization', `Bearer ${accessToken}`)
            .query({ limit: 101 });
        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('status', 'error');
        expect(res.body).toHaveProperty('message', 'Error occurred while retrieving transactions.');
        expect(res.body.data).toHaveProperty('limit', 'Limit must be between 1 and 100.');
    });

    it('should return 400 when sortBy is invalid', async () => {
        const res = await request(app)
            .get('/v1/transactions')
            .set('Authorization', `Bearer ${accessToken}`)
            .query({ sortBy: 'description' });
        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('status', 'error');
        expect(res.body).toHaveProperty('message', 'Error occurred while retrieving transactions.');
        expect(res.body.data).toHaveProperty('sortBy', 'Sort field must be date, amount, or createdAt.');
    });

    it('should return 400 when sortOrder is invalid', async () => {
        const res = await request(app)
            .get('/v1/transactions')
            .set('Authorization', `Bearer ${accessToken}`)
            .query({ sortOrder: 'RANDOM' });
        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('status', 'error');
        expect(res.body).toHaveProperty('message', 'Error occurred while retrieving transactions.');
        expect(res.body.data).toHaveProperty('sortOrder', 'Sort order must be ASC or DESC.');
    });

    // ─── Success — default behaviour ──────────────────────────────────────────

    it('should return 200 with all transactions and the correct response shape', async () => {
        const res = await request(app)
            .get('/v1/transactions')
            .set('Authorization', `Bearer ${accessToken}`);
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('status', 'success');
        expect(res.body).toHaveProperty('message', 'Transactions retrieved successfully.');

        const { transactions, pagination, sorting, filters } = res.body.data;

        expect(transactions).toHaveLength(5);

        // Serialized shape — spot-check the first item
        const first = transactions[0];
        expect(first).toHaveProperty('transactionId');
        expect(first).not.toHaveProperty('id');
        expect(first).not.toHaveProperty('deletedAt');
        expect(first).toHaveProperty('amount');
        expect(first).toHaveProperty('type');
        expect(first).toHaveProperty('date');
        expect(first.category).toHaveProperty('categoryId');
        expect(first.category).toHaveProperty('name');
        expect(typeof first.amount).toBe('number');

        // Pagination shape
        expect(pagination).toMatchObject({
            currentPage: 1,
            pageSize: 10,
            totalRecords: 5,
            totalPages: 1,
            hasNext: false,
            hasPrevious: false,
        });

        // Sorting defaults
        expect(sorting).toMatchObject({ sortBy: 'date', sortOrder: 'DESC' });

        // Filters empty when none applied
        expect(filters).toEqual({});
    });

    it('should default to sorting by date descending', async () => {
        const res = await request(app)
            .get('/v1/transactions')
            .set('Authorization', `Bearer ${accessToken}`);
        expect(res.status).toBe(200);
        const dates = res.body.data.transactions.map((t) => t.date);
        const sorted = [...dates].sort((a, b) => b.localeCompare(a));
        expect(dates).toEqual(sorted);
    });

    // ─── Filtering ────────────────────────────────────────────────────────────

    it('should return only expense transactions when filtered by type=expense', async () => {
        const res = await request(app)
            .get('/v1/transactions')
            .set('Authorization', `Bearer ${accessToken}`)
            .query({ type: 'expense' });
        expect(res.status).toBe(200);
        const { transactions, filters } = res.body.data;
        expect(transactions).toHaveLength(3);
        transactions.forEach((t) => expect(t.type).toBe('expense'));
        expect(filters).toEqual({ type: 'expense' });
    });

    it('should return only income transactions when filtered by type=income', async () => {
        const res = await request(app)
            .get('/v1/transactions')
            .set('Authorization', `Bearer ${accessToken}`)
            .query({ type: 'income' });
        expect(res.status).toBe(200);
        const { transactions } = res.body.data;
        expect(transactions).toHaveLength(2);
        transactions.forEach((t) => expect(t.type).toBe('income'));
    });

    it('should return only transactions for the given categoryId', async () => {
        const res = await request(app)
            .get('/v1/transactions')
            .set('Authorization', `Bearer ${accessToken}`)
            .query({ categoryId: expenseCategory.id });
        expect(res.status).toBe(200);
        const { transactions, filters } = res.body.data;
        expect(transactions).toHaveLength(3);
        transactions.forEach((t) => expect(t.category.categoryId).toBe(expenseCategory.id));
        expect(filters).toEqual({ categoryId: expenseCategory.id });
    });

    it('should filter by date range using startDate and endDate', async () => {
        const res = await request(app)
            .get('/v1/transactions')
            .set('Authorization', `Bearer ${accessToken}`)
            .query({ startDate: '2026-03-01', endDate: '2026-03-10' });
        expect(res.status).toBe(200);
        const { transactions, filters } = res.body.data;
        // income1 (03-01), expense1 (03-05), expense3 (03-10) — income2 (03-15) and expense2 (02-20) excluded
        expect(transactions).toHaveLength(3);
        transactions.forEach((t) => {
            expect(t.date >= '2026-03-01').toBe(true);
            expect(t.date <= '2026-03-10').toBe(true);
        });
        expect(filters).toEqual({ startDate: '2026-03-01', endDate: '2026-03-10' });
    });

    it('should filter by startDate only', async () => {
        const res = await request(app)
            .get('/v1/transactions')
            .set('Authorization', `Bearer ${accessToken}`)
            .query({ startDate: '2026-03-10' });
        expect(res.status).toBe(200);
        const { transactions } = res.body.data;
        // expense3 (03-10) and income2 (03-15)
        expect(transactions).toHaveLength(2);
        transactions.forEach((t) => expect(t.date >= '2026-03-10').toBe(true));
    });

    it('should filter by search term against description', async () => {
        const res = await request(app)
            .get('/v1/transactions')
            .set('Authorization', `Bearer ${accessToken}`)
            .query({ search: 'salary' });
        expect(res.status).toBe(200);
        const { transactions, filters } = res.body.data;
        expect(transactions).toHaveLength(1);
        expect(transactions[0].transactionId).toBe(income1.id);
        expect(filters).toEqual({ search: 'salary' });
    });

    it('should return an empty list when the search term matches nothing', async () => {
        const res = await request(app)
            .get('/v1/transactions')
            .set('Authorization', `Bearer ${accessToken}`)
            .query({ search: 'zzznomatch' });
        expect(res.status).toBe(200);
        expect(res.body.data.transactions).toHaveLength(0);
        expect(res.body.data.pagination.totalRecords).toBe(0);
    });

    it('should apply multiple filters together', async () => {
        const res = await request(app)
            .get('/v1/transactions')
            .set('Authorization', `Bearer ${accessToken}`)
            .query({ type: 'expense', startDate: '2026-03-01' });
        expect(res.status).toBe(200);
        const { transactions } = res.body.data;
        // expense1 (03-05) and expense3 (03-10) — expense2 (02-20) excluded by date, income* excluded by type
        expect(transactions).toHaveLength(2);
        transactions.forEach((t) => {
            expect(t.type).toBe('expense');
            expect(t.date >= '2026-03-01').toBe(true);
        });
    });

    // ─── Pagination ───────────────────────────────────────────────────────────

    it('should return the first page correctly when limit is set', async () => {
        const res = await request(app)
            .get('/v1/transactions')
            .set('Authorization', `Bearer ${accessToken}`)
            .query({ page: 1, limit: 2 });
        expect(res.status).toBe(200);
        const { transactions, pagination } = res.body.data;
        expect(transactions).toHaveLength(2);
        expect(pagination).toMatchObject({
            currentPage: 1,
            pageSize: 2,
            totalRecords: 5,
            totalPages: 3,
            hasNext: true,
            hasPrevious: false,
        });
    });

    it('should return the second page correctly', async () => {
        const res = await request(app)
            .get('/v1/transactions')
            .set('Authorization', `Bearer ${accessToken}`)
            .query({ page: 2, limit: 2 });
        expect(res.status).toBe(200);
        const { transactions, pagination } = res.body.data;
        expect(transactions).toHaveLength(2);
        expect(pagination).toMatchObject({
            currentPage: 2,
            pageSize: 2,
            totalRecords: 5,
            totalPages: 3,
            hasNext: true,
            hasPrevious: true,
        });
    });

    it('should return the last page correctly', async () => {
        const res = await request(app)
            .get('/v1/transactions')
            .set('Authorization', `Bearer ${accessToken}`)
            .query({ page: 3, limit: 2 });
        expect(res.status).toBe(200);
        const { transactions, pagination } = res.body.data;
        expect(transactions).toHaveLength(1);
        expect(pagination).toMatchObject({
            currentPage: 3,
            pageSize: 2,
            totalRecords: 5,
            totalPages: 3,
            hasNext: false,
            hasPrevious: true,
        });
    });

    // ─── Sorting ──────────────────────────────────────────────────────────────

    it('should sort by amount ascending', async () => {
        const res = await request(app)
            .get('/v1/transactions')
            .set('Authorization', `Bearer ${accessToken}`)
            .query({ sortBy: 'amount', sortOrder: 'ASC' });
        expect(res.status).toBe(200);
        const amounts = res.body.data.transactions.map((t) => t.amount);
        const sorted = [...amounts].sort((a, b) => a - b);
        expect(amounts).toEqual(sorted);
        expect(res.body.data.sorting).toEqual({ sortBy: 'amount', sortOrder: 'ASC' });
    });

    it('should sort by amount descending', async () => {
        const res = await request(app)
            .get('/v1/transactions')
            .set('Authorization', `Bearer ${accessToken}`)
            .query({ sortBy: 'amount', sortOrder: 'DESC' });
        expect(res.status).toBe(200);
        const amounts = res.body.data.transactions.map((t) => t.amount);
        const sorted = [...amounts].sort((a, b) => b - a);
        expect(amounts).toEqual(sorted);
    });

    it('should sort by date ascending', async () => {
        const res = await request(app)
            .get('/v1/transactions')
            .set('Authorization', `Bearer ${accessToken}`)
            .query({ sortBy: 'date', sortOrder: 'ASC' });
        expect(res.status).toBe(200);
        const dates = res.body.data.transactions.map((t) => t.date);
        const sorted = [...dates].sort((a, b) => a.localeCompare(b));
        expect(dates).toEqual(sorted);
    });

    // ─── Isolation ────────────────────────────────────────────────────────────

    it('should not return transactions belonging to other users', async () => {
        const otherUser = await User.create({
            id: faker.string.uuid(),
            name: faker.person.fullName(),
            email: faker.internet.email(),
            passwordHash: 'irrelevant',
        });
        const otherCategory = await Category.create({
            userId: otherUser.id,
            name: 'Other',
            type: 'expense',
            isDefault: false,
        });
        await Transaction.create({
            userId: otherUser.id,
            categoryId: otherCategory.id,
            amount: 999,
            type: 'expense',
            date: '2026-03-01',
            description: 'Should not appear',
        });

        const res = await request(app)
            .get('/v1/transactions')
            .set('Authorization', `Bearer ${accessToken}`);
        expect(res.status).toBe(200);
        expect(res.body.data.transactions).toHaveLength(5);
        const ids = res.body.data.transactions.map((t) => t.transactionId);
        expect(ids).not.toContain(expect.stringMatching(otherUser.id));

        await Transaction.destroy({ where: { userId: otherUser.id }, force: true });
        await Category.destroy({ where: { userId: otherUser.id }, force: true });
        await User.destroy({ where: { id: otherUser.id }, force: true });
    });

    // ─── Error propagation ────────────────────────────────────────────────────

    it('should call next() with an error if any exception is thrown', async () => {
        const req = { user: { sub: 'x' }, query: {}, where: {}, filters: {} };
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        const next = jest.fn();
        await listTransactionsController(req, res, next);
        expect(next).toHaveBeenCalled();
    });
});
