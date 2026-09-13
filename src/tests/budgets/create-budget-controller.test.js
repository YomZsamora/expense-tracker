'use strict';

const request = require('supertest');
const app = require('../../index');
const { faker } = require('@faker-js/faker');
const { User } = require('../../models/user');
const { Category } = require('../../models/category');
const { Budget } = require('../../models/budget');
const tokenService = require('../../services/token-service');
const { createBudgetController } = require('../../app/controllers/budget-controller');

describe('POST /v1/budgets', () => {

    let user;
    let otherUser;
    let accessToken;
    let expenseCategory;
    let incomeCategory;

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
        expenseCategory = await Category.create({
            userId: user.id,
            name: 'Groceries',
            type: 'expense',
            isDefault: false,
        });
        incomeCategory = await Category.create({
            userId: user.id,
            name: 'Salary',
            type: 'income',
            isDefault: false,
        });
    });

    afterAll(async () => {
        await Budget.destroy({ where: { userId: user.id } });
        await Category.destroy({ where: { userId: user.id }, force: true });
        await Category.destroy({ where: { userId: otherUser.id }, force: true });
        await User.destroy({ where: { id: user.id }, force: true });
        await User.destroy({ where: { id: otherUser.id }, force: true });
    });

    it('should return 401 when no Authorization header is provided', async () => {
        const res = await request(app).post('/v1/budgets');
        expect(res.status).toBe(401);
        expect(res.body).toHaveProperty('status', 'error');
        expect(res.body).toHaveProperty('message', 'Authentication credentials were not provided.');
    });

    it('should return 400 when categoryId is missing', async () => {
        const res = await request(app)
            .post('/v1/budgets')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ amount: 500, month: 9, year: 2026 });

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('status', 'error');
        expect(res.body).toHaveProperty('message', 'Error occurred while creating budget.');
        expect(res.body.data).toHaveProperty('categoryId', 'Category is required.');
    });

    it('should return 400 when categoryId is not a valid UUID', async () => {
        const res = await request(app)
            .post('/v1/budgets')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ categoryId: 'not-a-uuid', amount: 500, month: 9, year: 2026 });

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('status', 'error');
        expect(res.body).toHaveProperty('message', 'Error occurred while creating budget.');
        expect(res.body.data).toHaveProperty('categoryId', 'Category ID must be a valid UUID.');
    });

    it('should return 400 when amount is missing', async () => {
        const res = await request(app)
            .post('/v1/budgets')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ categoryId: expenseCategory.id, month: 9, year: 2026 });

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('status', 'error');
        expect(res.body).toHaveProperty('message', 'Error occurred while creating budget.');
        expect(res.body.data).toHaveProperty('amount', 'Amount is required.');
    });

    it('should return 400 when amount is not a positive number', async () => {
        const res = await request(app)
            .post('/v1/budgets')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ categoryId: expenseCategory.id, amount: -50, month: 9, year: 2026 });

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('status', 'error');
        expect(res.body).toHaveProperty('message', 'Error occurred while creating budget.');
        expect(res.body.data).toHaveProperty('amount', 'Amount must be a positive number.');
    });

    it('should return 400 when amount has more than 2 decimal places', async () => {
        const res = await request(app)
            .post('/v1/budgets')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ categoryId: expenseCategory.id, amount: 100.123, month: 9, year: 2026 });

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('status', 'error');
        expect(res.body).toHaveProperty('message', 'Error occurred while creating budget.');
        expect(res.body.data).toHaveProperty('amount', 'Amount cannot have more than 2 decimal places.');
    });

    it('should return 400 when month is missing', async () => {
        const res = await request(app)
            .post('/v1/budgets')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ categoryId: expenseCategory.id, amount: 500, year: 2026 });

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('status', 'error');
        expect(res.body).toHaveProperty('message', 'Error occurred while creating budget.');
        expect(res.body.data).toHaveProperty('month', 'Month is required.');
    });

    it('should return 400 when month is out of range', async () => {
        const res = await request(app)
            .post('/v1/budgets')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ categoryId: expenseCategory.id, amount: 500, month: 13, year: 2026 });

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('status', 'error');
        expect(res.body).toHaveProperty('message', 'Error occurred while creating budget.');
        expect(res.body.data).toHaveProperty('month', 'Month must be an integer between 1 and 12.');
    });

    it('should return 400 when year is missing', async () => {
        const res = await request(app)
            .post('/v1/budgets')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ categoryId: expenseCategory.id, amount: 500, month: 9 });

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('status', 'error');
        expect(res.body).toHaveProperty('message', 'Error occurred while creating budget.');
        expect(res.body.data).toHaveProperty('year', 'Year is required.');
    });

    it('should return 400 when year is before 2000', async () => {
        const res = await request(app)
            .post('/v1/budgets')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ categoryId: expenseCategory.id, amount: 500, month: 9, year: 1999 });

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('status', 'error');
        expect(res.body).toHaveProperty('message', 'Error occurred while creating budget.');
        expect(res.body.data).toHaveProperty('year', 'Year must be 2000 or later.');
    });

    it('should return 400 when year exceeds current year + 1', async () => {
        const maxYear = new Date().getFullYear() + 1;
        const res = await request(app)
            .post('/v1/budgets')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ categoryId: expenseCategory.id, amount: 500, month: 9, year: maxYear + 1 });

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('status', 'error');
        expect(res.body).toHaveProperty('message', 'Error occurred while creating budget.');
        expect(res.body.data).toHaveProperty('year', `Year cannot be later than ${maxYear}.`);
    });

    it('should return 400 when categoryId does not exist', async () => {
        const res = await request(app)
            .post('/v1/budgets')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ categoryId: faker.string.uuid(), amount: 500, month: 9, year: 2026 });

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('status', 'error');
        expect(res.body).toHaveProperty('message', 'Validation failed.');
        expect(res.body.data).toHaveProperty('categoryId', 'Category could not found.');
    });

    it('should return 400 when categoryId belongs to a different user', async () => {
        const otherCategory = await Category.create({
            userId: otherUser.id,
            name: 'Other Groceries',
            type: 'expense',
            isDefault: false,
        });

        const res = await request(app)
            .post('/v1/budgets')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ categoryId: otherCategory.id, amount: 500, month: 9, year: 2026 });

        await Category.destroy({ where: { id: otherCategory.id }, force: true });

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('status', 'error');
        expect(res.body).toHaveProperty('message', 'Validation failed.');
        expect(res.body.data).toHaveProperty('categoryId', 'Category does not belong to you.');
    });

    it('should return 400 when categoryId refers to an income category', async () => {
        const res = await request(app)
            .post('/v1/budgets')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ categoryId: incomeCategory.id, amount: 500, month: 9, year: 2026 });

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('status', 'error');
        expect(res.body).toHaveProperty('message', 'Validation failed.');
        expect(res.body.data).toHaveProperty('categoryId', 'Only expense categories can have budgets.');
    });

    it('should return 201 with the created budget', async () => {
        const res = await request(app)
            .post('/v1/budgets')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ categoryId: expenseCategory.id, amount: 500.00, month: 9, year: 2026 });

        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty('status', 'success');
        expect(res.body).toHaveProperty('message', 'Budget created successfully.');
        expect(res.body.data).toMatchObject({
            amount: 500,
            month: 9,
            year: 2026,
            category: {
                name: 'Groceries',
                type: 'expense',
            },
        });
        expect(res.body.data).toHaveProperty('budgetId');
        expect(res.body.data).not.toHaveProperty('id');
        expect(res.body.data).not.toHaveProperty('userId');
        expect(res.body.data).toHaveProperty('createdAt');
        expect(res.body.data).toHaveProperty('updatedAt');
    });

    it('should return 409 when a budget already exists for the same category, month, and year', async () => {
        const res = await request(app)
            .post('/v1/budgets')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ categoryId: expenseCategory.id, amount: 300, month: 9, year: 2026 });

        expect(res.status).toBe(409);
        expect(res.body).toHaveProperty('status', 'error');
        expect(res.body).toHaveProperty('message', 'A budget already exists for this category, month, and year.');
    });

    it('should call next() with an error if any exception is thrown', async () => {
        const req = {};
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        const next = jest.fn();
        await createBudgetController(req, res, next);
        expect(next).toHaveBeenCalled();
    });
});
