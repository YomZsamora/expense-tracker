'use strict';

const { body, query } = require('express-validator');
const { BadRequest, NotFound, PermissionDenied } = require('../exceptions/custom-exceptions');
const categoryRepository = require('../../repositories/category-repository');
const transactionRepository = require('../../repositories/transaction-repository');

const amountFieldValidator = body('amount')
    .notEmpty().withMessage('Amount is required.')
    .isFloat({ min: 0.01 }).withMessage('Amount must be a positive number.')
    .custom((value) => {
        if (!/^\d+(\.\d{1,2})?$/.test(String(value))) {
            throw new Error('Amount cannot have more than 2 decimal places.');
        }
        return true;
    });

const typeFieldValidator = body('type')
    .notEmpty().withMessage('Type is required.')
    .isIn(['income', 'expense']).withMessage('Type must be income or expense.');

const categoryIdFieldValidator = body('categoryId')
    .notEmpty().withMessage('Category is required.')
    .isUUID().withMessage('Category ID must be a valid UUID.');

const dateFieldValidator = body('date')
    .notEmpty().withMessage('Date is required.')
    .isISO8601({ strict: true }).withMessage('Date must be a valid date in YYYY-MM-DD format.');

const descriptionFieldValidator = body('description')
    .optional()
    .isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters.');

const resolveCategoryForTransaction = async (req, res, next) => {
    try {
        const { categoryId, type } = req.body;
        const category = await categoryRepository.findCategoryById(categoryId);
        if (!category) return next(new BadRequest('Validation failed.', { categoryId: 'Category not found.' }));
        if (category.userId !== req.user.sub) return next(new BadRequest('Validation failed.', { categoryId: 'Category does not belong to you.' }));
        if (category.type !== type) {
            return next(new BadRequest('Validation failed.', {
                type: `Transaction type must match the category type (${category.type}).`,
            }));
        }
        req.resolvedCategory = category;
        next();
    } catch (error) {
        next(error);
    }
};

const resolveTransactionMiddleware = async (req, res, next) => {
    try {
        const transaction = await transactionRepository.findTransactionById(req.params.id);
        if (!transaction) return next(new NotFound('Transaction could not found.'));
        if (transaction.userId !== req.user.sub) return next(new PermissionDenied());
        req.transaction = transaction;
        next();
    } catch (error) {
        next(error);
    }
};

const amountFieldOptionalValidator = body('amount')
    .optional()
    .isFloat({ min: 0.01 }).withMessage('Amount must be a positive number.')
    .custom((value) => {
        if (!/^\d+(\.\d{1,2})?$/.test(String(value))) {
            throw new Error('Amount cannot have more than 2 decimal places.');
        }
        return true;
    });

const typeFieldOptionalValidator = body('type')
    .optional()
    .isIn(['income', 'expense']).withMessage('Type must be income or expense.');

const categoryIdFieldOptionalValidator = body('categoryId')
    .optional()
    .isUUID().withMessage('Category ID must be a valid UUID.');

const dateFieldOptionalValidator = body('date')
    .optional()
    .isISO8601({ strict: true }).withMessage('Date must be a valid date in YYYY-MM-DD format.');

const resolveCategoryForTransactionUpdate = async (req, res, next) => {
    try {
        const { categoryId, type } = req.body;
        if (categoryId === undefined && type === undefined) return next();

        const finalCategoryId = categoryId ?? req.transaction.categoryId;
        const finalType = type ?? req.transaction.type;

        const category = await categoryRepository.findCategoryById(finalCategoryId);
        if (!category) return next(new BadRequest('Validation failed.', { categoryId: 'Category not found.' }));
        if (category.userId !== req.user.sub) return next(new BadRequest('Validation failed.', { categoryId: 'Category does not belong to you.' }));
        if (category.type !== finalType) {
            return next(new BadRequest('Validation failed.', {
                type: `Transaction type must match the category type (${category.type}).`,
            }));
        }
        next();
    } catch (error) {
        next(error);
    }
};

const listTransactionsQueryValidator = [
    query('type')
        .optional()
        .isIn(['income', 'expense']).withMessage('Type must be income or expense.'),
    query('categoryId')
        .optional()
        .isUUID().withMessage('Category ID must be a valid UUID.'),
    query('startDate')
        .optional()
        .isISO8601({ strict: true }).withMessage('Start date must be a valid YYYY-MM-DD date.'),
    query('endDate')
        .optional()
        .isISO8601({ strict: true }).withMessage('End date must be a valid YYYY-MM-DD date.'),
    query('search')
        .optional()
        .isLength({ max: 100 }).withMessage('Search term cannot exceed 100 characters.'),
    query('page')
        .optional()
        .isInt({ min: 1 }).withMessage('Page must be a positive integer.'),
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100.'),
    query('sortBy')
        .optional()
        .isIn(['date', 'amount', 'createdAt']).withMessage('Sort field must be date, amount, or createdAt.'),
    query('sortOrder')
        .optional()
        .isIn(['ASC', 'asc', 'DESC', 'desc']).withMessage('Sort order must be ASC or DESC.'),
];


module.exports = {
    amountFieldValidator,
    typeFieldValidator,
    categoryIdFieldValidator,
    dateFieldValidator,
    descriptionFieldValidator,
    resolveCategoryForTransaction,
    resolveTransactionMiddleware,
    amountFieldOptionalValidator,
    typeFieldOptionalValidator,
    categoryIdFieldOptionalValidator,
    dateFieldOptionalValidator,
    resolveCategoryForTransactionUpdate,
    listTransactionsQueryValidator,
};
