'use strict';

const request = require('supertest');
const app = require('../../index');
const { faker } = require('@faker-js/faker');
const { User } = require('../../models/user');
const { Category } = require('../../models/category');
const { Budget } = require('../../models/budget');
const tokenService = require('../../services/token-service');
const { deleteBudgetController } = require('../../app/controllers/budget-controller');

describe('DELETE /v1/budgets/:id', () => {

    let user;
    let otherUser;
    let accessToken;
    let expenseCategory;

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
    });

    afterAll(async () => {
        await Budget.destroy({ where: { userId: user.id } });
        await Category.destroy({ where: { userId: user.id }, force: true });
        await Category.destroy({ where: { userId: otherUser.id }, force: true });
        await User.destroy({ where: { id: user.id }, force: true });
        await User.destroy({ where: { id: otherUser.id }, force: true });
    });

    it('should return 401 when no Authorization header is provided', async () => {
        const res = await request(app).delete('/v1/budgets/00000000-0000-0000-0000-000000000000');
        expect(res.status).toBe(401);
        expect(res.body).toHaveProperty('status', 'error');
        expect(res.body).toHaveProperty('message', 'Authentication credentials were not provided.');
    });

    it('should return 404 when the budget does not exist', async () => {
        const res = await request(app)
            .delete('/v1/budgets/00000000-0000-0000-0000-000000000000')
            .set('Authorization', `Bearer ${accessToken}`);

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
            month: 8,
            year: 2026,
        });

        const res = await request(app)
            .delete(`/v1/budgets/${otherBudget.id}`)
            .set('Authorization', `Bearer ${accessToken}`);

        await Budget.destroy({ where: { id: otherBudget.id } });
        await Category.destroy({ where: { id: otherExpenseCategory.id }, force: true });

        expect(res.status).toBe(403);
        expect(res.body).toHaveProperty('status', 'error');
        expect(res.body).toHaveProperty('message', "You don't have required permission to perform this action.");
    });

    it('should return 204 and hard-delete the budget', async () => {
        const budget = await Budget.create({
            userId: user.id,
            categoryId: expenseCategory.id,
            amount: 500.00,
            month: 9,
            year: 2026,
        });

        const res = await request(app)
            .delete(`/v1/budgets/${budget.id}`)
            .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(204);
        expect(res.body).toEqual({});

        const deleted = await Budget.findByPk(budget.id);
        expect(deleted).toBeNull();
    });

    it('should call next() with an error if any exception is thrown', async () => {
        const req = {};
        const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };
        const next = jest.fn();
        await deleteBudgetController(req, res, next);
        expect(next).toHaveBeenCalled();
    });
});
