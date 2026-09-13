'use strict';

const request = require('supertest');
const app = require('../../index');
const { faker } = require('@faker-js/faker');
const { User } = require('../../models/user');
const { Category } = require('../../models/category');
const { Budget } = require('../../models/budget');
const tokenService = require('../../services/token-service');
const { listBudgetsController } = require('../../app/controllers/budget-controller');

describe('GET /v1/budgets', () => {

    let user;
    let otherUser;
    let accessToken;
    let groceriesCategory;
    let rentCategory;
    let entertainmentCategory;

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

        groceriesCategory = await Category.create({
            userId: user.id,
            name: 'Groceries',
            type: 'expense',
            isDefault: false,
        });
        rentCategory = await Category.create({
            userId: user.id,
            name: 'Rent',
            type: 'expense',
            isDefault: false,
        });
        entertainmentCategory = await Category.create({
            userId: user.id,
            name: 'Entertainment',
            type: 'expense',
            isDefault: false,
        });

        await Budget.bulkCreate([
            { userId: user.id, categoryId: groceriesCategory.id, amount: 300.00, month: 8, year: 2026 },
            { userId: user.id, categoryId: rentCategory.id,      amount: 1200.00, month: 8, year: 2026 },
            { userId: user.id, categoryId: groceriesCategory.id, amount: 350.00, month: 9, year: 2026 },
            { userId: user.id, categoryId: entertainmentCategory.id, amount: 100.00, month: 9, year: 2026 },
            { userId: user.id, categoryId: rentCategory.id,      amount: 1200.00, month: 9, year: 2026 },
        ]);
    });

    afterAll(async () => {
        await Budget.destroy({ where: { userId: user.id } });
        await Budget.destroy({ where: { userId: otherUser.id } });
        await Category.destroy({ where: { userId: user.id }, force: true });
        await Category.destroy({ where: { userId: otherUser.id }, force: true });
        await User.destroy({ where: { id: user.id }, force: true });
        await User.destroy({ where: { id: otherUser.id }, force: true });
    });

    it('should return 401 when no Authorization header is provided', async () => {
        const res = await request(app).get('/v1/budgets');
        expect(res.status).toBe(401);
        expect(res.body).toHaveProperty('status', 'error');
        expect(res.body).toHaveProperty('message', 'Authentication credentials were not provided.');
    });

    it('should return 400 when month is out of range', async () => {
        const res = await request(app)
            .get('/v1/budgets?month=13')
            .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('status', 'error');
        expect(res.body).toHaveProperty('message', 'Error occurred while retrieving budgets.');
        expect(res.body.data).toHaveProperty('month', 'Month must be an integer between 1 and 12.');
    });

    it('should return 400 when year is before 2000', async () => {
        const res = await request(app)
            .get('/v1/budgets?year=1999')
            .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('status', 'error');
        expect(res.body).toHaveProperty('message', 'Error occurred while retrieving budgets.');
        expect(res.body.data).toHaveProperty('year', 'Year must be 2000 or later.');
    });

    it('should return 400 when year exceeds current year + 1', async () => {
        const maxYear = new Date().getFullYear() + 1;
        const res = await request(app)
            .get(`/v1/budgets?year=${maxYear + 1}`)
            .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('status', 'error');
        expect(res.body).toHaveProperty('message', 'Error occurred while retrieving budgets.');
        expect(res.body.data).toHaveProperty('year', `Year cannot be later than ${maxYear}.`);
    });

    it('should return 200 with all user budgets when no filters are applied', async () => {
        const res = await request(app)
            .get('/v1/budgets')
            .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('status', 'success');
        expect(res.body).toHaveProperty('message', 'Budgets retrieved successfully.');
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.data).toHaveLength(5);
        expect(res.body.data[0]).toHaveProperty('budgetId');
        expect(res.body.data[0]).toHaveProperty('amount');
        expect(res.body.data[0]).toHaveProperty('month');
        expect(res.body.data[0]).toHaveProperty('year');
        expect(res.body.data[0]).toHaveProperty('category');
        expect(res.body.data[0]).not.toHaveProperty('id');
        expect(res.body.data[0]).not.toHaveProperty('userId');
    });

    it('should return budgets filtered by month and year', async () => {
        const res = await request(app)
            .get('/v1/budgets?month=9&year=2026')
            .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data).toHaveLength(3);
        res.body.data.forEach((b) => {
            expect(b.month).toBe(9);
            expect(b.year).toBe(2026);
        });
    });

    it('should return budgets filtered by month only', async () => {
        const res = await request(app)
            .get('/v1/budgets?month=8')
            .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data).toHaveLength(2);
        res.body.data.forEach((b) => expect(b.month).toBe(8));
    });

    it('should return budgets filtered by year only', async () => {
        const res = await request(app)
            .get('/v1/budgets?year=2026')
            .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data).toHaveLength(5);
        res.body.data.forEach((b) => expect(b.year).toBe(2026));
    });

    it('should return an empty array when no budgets match the filter', async () => {
        const res = await request(app)
            .get('/v1/budgets?month=1&year=2020')
            .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data).toEqual([]);
    });

    it('should not include budgets belonging to other users', async () => {
        const otherCategory = await Category.create({
            userId: otherUser.id,
            name: 'Other Rent',
            type: 'expense',
            isDefault: false,
        });
        await Budget.create({
            userId: otherUser.id,
            categoryId: otherCategory.id,
            amount: 900.00,
            month: 9,
            year: 2026,
        });

        const res = await request(app)
            .get('/v1/budgets?month=9&year=2026')
            .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data).toHaveLength(3);
        res.body.data.forEach((b) => {
            expect(b).not.toHaveProperty('userId', otherUser.id);
        });
    });

    it('should return the correct serialized shape including nested category', async () => {
        const res = await request(app)
            .get('/v1/budgets?month=8&year=2026')
            .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(200);
        const budget = res.body.data.find((b) => b.category.name === 'Groceries');
        expect(budget).toMatchObject({
            amount: 300,
            month: 8,
            year: 2026,
            category: {
                name: 'Groceries',
                type: 'expense',
            },
        });
        expect(budget.category).toHaveProperty('categoryId');
        expect(budget).not.toHaveProperty('id');
        expect(budget).not.toHaveProperty('userId');
    });

    it('should call next() with an error if any exception is thrown', async () => {
        const req = { user: { sub: 'x' }, query: {} };
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        const next = jest.fn();
        jest.spyOn(require('../../repositories/budget-repository'), 'findUserBudgets')
            .mockRejectedValueOnce(new Error('DB error'));
        await listBudgetsController(req, res, next);
        expect(next).toHaveBeenCalled();
    });
});
