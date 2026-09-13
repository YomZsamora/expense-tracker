'use strict';

const request = require('supertest');
const app = require('../../index');
const { faker } = require('@faker-js/faker');
const { User } = require('../../models/user');
const { Category } = require('../../models/category');
const { Budget } = require('../../models/budget');
const tokenService = require('../../services/token-service');
const { updateBudgetController } = require('../../app/controllers/budget-controller');

describe('PATCH /v1/budgets/:id', () => {

    let user;
    let otherUser;
    let accessToken;
    let expenseCategory;
    let budget;

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
        budget = await Budget.create({
            userId: user.id,
            categoryId: expenseCategory.id,
            amount: 500.00,
            month: 9,
            year: 2026,
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
        const res = await request(app).patch(`/v1/budgets/${budget.id}`);
        expect(res.status).toBe(401);
        expect(res.body).toHaveProperty('status', 'error');
        expect(res.body).toHaveProperty('message', 'Authentication credentials were not provided.');
    });

    it('should return 400 when amount is missing', async () => {
        const res = await request(app)
            .patch(`/v1/budgets/${budget.id}`)
            .set('Authorization', `Bearer ${accessToken}`)
            .send({});

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('status', 'error');
        expect(res.body).toHaveProperty('message', 'Error occurred while updating budget.');
        expect(res.body.data).toHaveProperty('amount', 'Amount is required.');
    });

    it('should return 400 when amount is not a positive number', async () => {
        const res = await request(app)
            .patch(`/v1/budgets/${budget.id}`)
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ amount: -100 });

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('status', 'error');
        expect(res.body).toHaveProperty('message', 'Error occurred while updating budget.');
        expect(res.body.data).toHaveProperty('amount', 'Amount must be a positive number.');
    });

    it('should return 400 when amount has more than 2 decimal places', async () => {
        const res = await request(app)
            .patch(`/v1/budgets/${budget.id}`)
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ amount: 100.999 });

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('status', 'error');
        expect(res.body).toHaveProperty('message', 'Error occurred while updating budget.');
        expect(res.body.data).toHaveProperty('amount', 'Amount cannot have more than 2 decimal places.');
    });

    it('should return 404 when the budget does not exist', async () => {
        const res = await request(app)
            .patch('/v1/budgets/00000000-0000-0000-0000-000000000000')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ amount: 750 });

        expect(res.status).toBe(404);
        expect(res.body).toHaveProperty('status', 'error');
        expect(res.body).toHaveProperty('message', 'Budget not found.');
    });

    it('should return 403 when the budget belongs to a different user', async () => {
        const otherExpenseCategory = await Category.create({
            userId: otherUser.id,
            name: 'Other Groceries',
            type: 'expense',
            isDefault: false,
        });
        const otherBudget = await Budget.create({
            userId: otherUser.id,
            categoryId: otherExpenseCategory.id,
            amount: 300.00,
            month: 9,
            year: 2026,
        });

        const res = await request(app)
            .patch(`/v1/budgets/${otherBudget.id}`)
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ amount: 750 });

        await Budget.destroy({ where: { id: otherBudget.id } });
        await Category.destroy({ where: { id: otherExpenseCategory.id }, force: true });

        expect(res.status).toBe(403);
        expect(res.body).toHaveProperty('status', 'error');
        expect(res.body).toHaveProperty('message', "You don't have required permission to perform this action.");
    });

    it('should return 200 with the updated budget amount', async () => {
        const res = await request(app)
            .patch(`/v1/budgets/${budget.id}`)
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ amount: 750.50 });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('status', 'success');
        expect(res.body).toHaveProperty('message', 'Budget updated successfully.');
        expect(res.body.data).toMatchObject({
            amount: 750.50,
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
    });

    it('should call next() with an error if any exception is thrown', async () => {
        const req = {};
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        const next = jest.fn();
        await updateBudgetController(req, res, next);
        expect(next).toHaveBeenCalled();
    });
});
