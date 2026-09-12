'use strict';

const { validationResult } = require('express-validator');
const categoryRepository = require('../../repositories/category-repository');
const {
    nameFieldValidator,
    typeFieldValidator,
    resolveCategoryMiddleware,
    categoryUniqueValidator,
    categoryDeletableValidator,
} = require('../../utils/validators/category-validators');
const { NotFound, PermissionDenied, Conflict } = require('../../utils/exceptions/custom-exceptions');

jest.mock('../../repositories/category-repository', () => ({
    findCategoryById: jest.fn(),
    findCategoryByNameAndType: jest.fn(),
    hasActiveTransactions: jest.fn(),
}));


describe('nameFieldValidator', () => {
    
    const run = async (body) => {
        const req = { body };
        await nameFieldValidator.run(req);
        return validationResult(req);
    };

    it('should pass with a valid name', async () => {
        const result = await run({ name: 'Groceries' });
        expect(result.isEmpty()).toBe(true);
    });

    it('should fail if name is missing', async () => {
        const result = await run({ name: '' });
        expect(result.array()[0].msg).toBe('Name is required.');
    });

    it('should fail if name is shorter than 2 characters', async () => {
        const result = await run({ name: 'A' });
        expect(result.array()[0].msg).toBe('Name must be at least 2 characters.');
    });

    it('should fail if name exceeds 100 characters', async () => {
        const result = await run({ name: 'A'.repeat(101) });
        expect(result.array()[0].msg).toBe('Name cannot exceed 100 characters.');
    });

    it('should trim leading and trailing whitespace before validating', async () => {
        const req = { body: { name: '  Groceries  ' } };
        await nameFieldValidator.run(req);
        expect(req.body.name).toBe('Groceries');
        expect(validationResult(req).isEmpty()).toBe(true);
    });
});

describe('typeFieldValidator', () => {

    const run = async (body) => {
        const req = { body };
        await typeFieldValidator.run(req);
        return validationResult(req);
    };

    it('should pass with type "income"', async () => {
        const result = await run({ type: 'income' });
        expect(result.isEmpty()).toBe(true);
    });

    it('should pass with type "expense"', async () => {
        const result = await run({ type: 'expense' });
        expect(result.isEmpty()).toBe(true);
    });

    it('should fail if type is missing', async () => {
        const result = await run({ type: '' });
        expect(result.array()[0].msg).toBe('Type is required.');
    });

    it('should fail if type is not "income" or "expense"', async () => {
        const result = await run({ type: 'savings' });
        expect(result.array()[0].msg).toBe('Type must be income or expense.');
    });
});

describe('resolveCategoryMiddleware', () => {
    
    let req, res, next;

    beforeEach(() => {
        req = { params: { id: 'cat-123' }, user: { sub: 'user-abc' } };
        res = {};
        next = jest.fn();
        jest.clearAllMocks();
    });

    it('should attach the category to req and call next() when found and owned by the user', async () => {
        const category = { id: 'cat-123', userId: 'user-abc' };
        categoryRepository.findCategoryById.mockResolvedValue(category);
        await resolveCategoryMiddleware(req, res, next);
        expect(req.category).toBe(category);
        expect(next).toHaveBeenCalledWith();
    });

    it('should call next(NotFound) if the category does not exist', async () => {
        categoryRepository.findCategoryById.mockResolvedValue(null);
        await resolveCategoryMiddleware(req, res, next);
        expect(next).toHaveBeenCalledWith(expect.any(NotFound));
    });

    it('should call next(PermissionDenied) if the category belongs to a different user', async () => {
        const category = { id: 'cat-123', userId: 'other-user' };
        categoryRepository.findCategoryById.mockResolvedValue(category);
        await resolveCategoryMiddleware(req, res, next);
        expect(next).toHaveBeenCalledWith(expect.any(PermissionDenied));
    });

    it('should call next(error) if the repository throws', async () => {
        const error = new Error('DB error');
        categoryRepository.findCategoryById.mockRejectedValue(error);
        await resolveCategoryMiddleware(req, res, next);
        expect(next).toHaveBeenCalledWith(error);
    });
});

describe('categoryUniqueValidator', () => {
    
    let req, res, next;

    beforeEach(() => {
        req = {
            params: { id: 'cat-123' },
            user: { sub: 'user-abc' },
            body: { name: 'Groceries', type: 'expense' },
            category: null,
        };
        res = {};
        next = jest.fn();
        jest.clearAllMocks();
    });

    it('should call next() if no category with that name and type exists', async () => {
        categoryRepository.findCategoryByNameAndType.mockResolvedValue(null);
        await categoryUniqueValidator(req, res, next);
        expect(next).toHaveBeenCalledWith();
    });

    it('should call next() if the existing match is the same category being updated (PATCH)', async () => {
        categoryRepository.findCategoryByNameAndType.mockResolvedValue({ id: 'cat-123' });
        await categoryUniqueValidator(req, res, next);
        expect(next).toHaveBeenCalledWith();
    });

    it('should call next(Conflict) if a different category with the same name and type already exists', async () => {
        categoryRepository.findCategoryByNameAndType.mockResolvedValue({ id: 'other-cat' });
        await categoryUniqueValidator(req, res, next);
        expect(next).toHaveBeenCalledWith(expect.any(Conflict));
    });

    it('should use the resolved category type on PATCH instead of req.body.type', async () => {
        req.category = { type: 'income' };
        categoryRepository.findCategoryByNameAndType.mockResolvedValue(null);
        await categoryUniqueValidator(req, res, next);
        expect(categoryRepository.findCategoryByNameAndType).toHaveBeenCalledWith(
            'user-abc', 'Groceries', 'income'
        );
        expect(next).toHaveBeenCalledWith();
    });

    it('should call next(error) if the repository throws', async () => {
        const error = new Error('DB error');
        categoryRepository.findCategoryByNameAndType.mockRejectedValue(error);
        await categoryUniqueValidator(req, res, next);
        expect(next).toHaveBeenCalledWith(error);
    });
});

describe('categoryDeletableValidator', () => {
    
    let req, res, next;

    beforeEach(() => {
        req = { category: { id: 'cat-123', isDefault: false } };
        res = {};
        next = jest.fn();
        jest.clearAllMocks();
    });

    it('should call next() if the category is not default and has no active transactions', async () => {
        categoryRepository.hasActiveTransactions.mockResolvedValue(false);
        await categoryDeletableValidator(req, res, next);
        expect(next).toHaveBeenCalledWith();
    });

    it('should call next(PermissionDenied) if the category is a default category', async () => {
        req.category.isDefault = true;
        await categoryDeletableValidator(req, res, next);
        expect(next).toHaveBeenCalledWith(expect.any(PermissionDenied));
        expect(categoryRepository.hasActiveTransactions).not.toHaveBeenCalled();
    });

    it('should call next(Conflict) if the category has active transactions', async () => {
        categoryRepository.hasActiveTransactions.mockResolvedValue(true);
        await categoryDeletableValidator(req, res, next);
        expect(next).toHaveBeenCalledWith(expect.any(Conflict));
    });

    it('should call next(error) if the repository throws', async () => {
        const error = new Error('DB error');
        categoryRepository.hasActiveTransactions.mockRejectedValue(error);
        await categoryDeletableValidator(req, res, next);
        expect(next).toHaveBeenCalledWith(error);
    });
});
