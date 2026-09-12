'use strict';

const request = require('supertest');
const app = require('../../index');
const { User } = require('../../models/user');
const { Category } = require('../../models/category');
const { Transaction } = require('../../models/transaction');
const tokenService = require('../../services/token-service');
const { faker } = require('@faker-js/faker');
const { createTransactionController } = require('../../app/controllers/transaction-controller');

describe('POST /v1/transactions/', () => {

    let user;
    let accessToken;
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
        transactionCategory = await Category.create({
            userId: user.id,
            name: faker.word.noun(),
            type: 'expense',
            isDefault: true,
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
            .post('/v1/transactions/')
            .send(transactionPayload);
        
        expect(res.status).toBe(401);
        expect(res.body).toHaveProperty('status', 'error');
        expect(res.body).toHaveProperty('message', 'Authentication credentials were not provided.');
    });

    it('should return validation errors if required fields are missing', async () => {
        const res = await request(app)
            .post('/v1/transactions/')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({});
        
        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('status', 'error');
        expect(res.body).toHaveProperty('message', 'Error occurred while creating transaction.');
        expect(res.body).toHaveProperty('data');

        expect(res.body.data.amount).toEqual('Amount is required.');
        expect(res.body.data.type).toEqual('Type is required.');
        expect(res.body.data.categoryId).toEqual('Category is required.');
        expect(res.body.data.date).toEqual('Date is required.');
    });

    it('should return validation errors if amount is not a positive number', async () => {
        transactionPayload.amount = -1000;
        const res = await request(app)
            .post('/v1/transactions/')
            .set('Authorization', `Bearer ${accessToken}`)
            .send(transactionPayload);
        
        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('status', 'error');
        expect(res.body).toHaveProperty('message', 'Error occurred while creating transaction.');
        expect(res.body).toHaveProperty('data');

        expect(res.body.data.amount).toEqual('Amount must be a positive number.');
    });

    it('should return validation errors if invalid type is provided', async () => {
        transactionPayload.type = 'invalid-type';
        const res = await request(app)
            .post('/v1/transactions/')
            .set('Authorization', `Bearer ${accessToken}`)
            .send(transactionPayload);
        
        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('status', 'error');
        expect(res.body).toHaveProperty('message', 'Error occurred while creating transaction.');
        expect(res.body).toHaveProperty('data');

        expect(res.body.data.type).toEqual('Type must be income or expense.');
    });

    it('should return validation errors if invalid category UUID is provided', async () => {
        transactionPayload.categoryId = 'invalid-id';
        const res = await request(app)
            .post('/v1/transactions/')
            .set('Authorization', `Bearer ${accessToken}`)
            .send(transactionPayload);
        
        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('status', 'error');
        expect(res.body).toHaveProperty('message', 'Error occurred while creating transaction.');
        expect(res.body).toHaveProperty('data');

        expect(res.body.data.categoryId).toEqual('Category ID must be a valid UUID.');
    });

    it('should return validation errors if invalid date is provided', async () => {
        transactionPayload.date = 'invalid-date';
        const res = await request(app)
            .post('/v1/transactions/')
            .set('Authorization', `Bearer ${accessToken}`)
            .send(transactionPayload);
        
        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('status', 'error');
        expect(res.body).toHaveProperty('message', 'Error occurred while creating transaction.');
        expect(res.body).toHaveProperty('data');

        expect(res.body.data.date).toEqual('Date must be a valid date in YYYY-MM-DD format.');
    });

    it('should return validation errors if description exceeds 500 characters', async () => {
        transactionPayload.description = faker.lorem.paragraphs(50)
        const res = await request(app)
            .post('/v1/transactions/')
            .set('Authorization', `Bearer ${accessToken}`)
            .send(transactionPayload);
        
        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('status', 'error');
        expect(res.body).toHaveProperty('message', 'Error occurred while creating transaction.');
        expect(res.body).toHaveProperty('data');

        expect(res.body.data.description).toEqual('Description cannot exceed 500 characters.');
    });

    it('should return not validation error if category UUID does not exist', async () => {
        transactionPayload.categoryId = faker.string.uuid();
        const res = await request(app)
            .post('/v1/transactions/')
            .set('Authorization', `Bearer ${accessToken}`)
            .send(transactionPayload);
        
        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('status', 'error');
        expect(res.body).toHaveProperty('message', 'Validation failed.');
        expect(res.body).toHaveProperty('data');

        expect(res.body.data.categoryId).toEqual('Category not found.');
    });

    it('should return validation error if category does not belong to the current user', async () => {
        otherUser = await User.create({
            id: faker.string.uuid(),
            name: faker.person.fullName(),
            email: faker.internet.email(),
            passwordHash: 'irrelevant',
        });
        missingUserCategory = await Category.create({
            userId: otherUser.id,
            name: faker.word.noun(),
            type: 'expense'
        });
        transactionPayload.categoryId = missingUserCategory.id;
        const res = await request(app)
            .post('/v1/transactions/')
            .set('Authorization', `Bearer ${accessToken}`)
            .send(transactionPayload);
        
        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('status', 'error');
        expect(res.body).toHaveProperty('message', 'Validation failed.');
        expect(res.body).toHaveProperty('data');

        expect(res.body.data.categoryId).toEqual('Category does not belong to you.');
    });

    it('should return not validation error if category does not match transaction category', async () => {
        otherCategory = await Category.create({
            userId: user.id,
            name: faker.word.noun(),
            type: 'income'
        });
        transactionPayload.categoryId = otherCategory.id;
        const res = await request(app)
            .post('/v1/transactions/')
            .set('Authorization', `Bearer ${accessToken}`)
            .send(transactionPayload);
        console.log(res.body);
        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('status', 'error');
        expect(res.body).toHaveProperty('message', 'Validation failed.');
        expect(res.body).toHaveProperty('data');

        expect(res.body.data.type).toEqual(`Transaction type must match the category type (${otherCategory.type}).`);
    });

    it('should allow authorized users to log transactions successfully', async () => {
        const res = await request(app)
            .post('/v1/transactions/')
            .set('Authorization', `Bearer ${accessToken}`)
            .send(transactionPayload);
        
        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty('status', 'success');
        expect(res.body).toHaveProperty('message', 'Transaction created successfully.');
        expect(res.body).toHaveProperty('data');

        const transactionData = res.body.data;
        createdTransaction = await Transaction.findByPk(transactionData.transactionId);
        expect(transactionData).toHaveProperty('transactionId', createdTransaction.id);
        expect(transactionData).toHaveProperty('amount', parseFloat(createdTransaction.amount));
        expect(transactionData).toHaveProperty('type', transactionData.type);
        expect(transactionData.category).toHaveProperty('categoryId', transactionCategory.id);
        expect(transactionData.category).toHaveProperty('name', transactionCategory.name);
        expect(transactionData).toHaveProperty('date', transactionData.date);
        expect(transactionData).toHaveProperty('description', transactionData.description);
    });

    it('should call next() with an error if any exception is thrown', async () => {
        req = {};
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        next = jest.fn();
        await createTransactionController(req, res, next);
        expect(next).toHaveBeenCalled();
    });
});
