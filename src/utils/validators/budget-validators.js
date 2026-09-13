'use strict';

const { body, query } = require('express-validator');
const { BadRequest, NotFound, PermissionDenied, Conflict } = require('../exceptions/custom-exceptions');
const categoryRepository = require('../../repositories/category-repository');
const budgetRepository = require('../../repositories/budget-repository');

const categoryIdFieldValidator = body('categoryId')
    .notEmpty().withMessage('Category is required.')
    .isUUID().withMessage('Category ID must be a valid UUID.');

const amountFieldValidator = body('amount')
    .notEmpty().withMessage('Amount is required.')
    .isFloat({ min: 0.01 }).withMessage('Amount must be a positive number.')
    .custom((value) => {
        if (!/^\d+(\.\d{1,2})?$/.test(String(value))) {
            throw new Error('Amount cannot have more than 2 decimal places.');
        }
        return true;
    });

const monthFieldValidator = body('month')
    .notEmpty().withMessage('Month is required.')
    .isInt({ min: 1, max: 12 }).withMessage('Month must be an integer between 1 and 12.');

const yearFieldValidator = body('year')
    .notEmpty().withMessage('Year is required.')
    .isInt({ min: 2000 }).withMessage('Year must be 2000 or later.')
    .custom((value) => {
        const maxYear = new Date().getFullYear() + 1;
        if (parseInt(value, 10) > maxYear) {
            throw new Error(`Year cannot be later than ${maxYear}.`);
        }
        return true;
    });

const listBudgetsQueryValidator = [
    query('month')
        .optional()
        .isInt({ min: 1, max: 12 }).withMessage('Month must be an integer between 1 and 12.'),
    query('year')
        .optional()
        .isInt({ min: 2000 }).withMessage('Year must be 2000 or later.')
        .custom((value) => {
            const maxYear = new Date().getFullYear() + 1;
            if (parseInt(value, 10) > maxYear) {
                throw new Error(`Year cannot be later than ${maxYear}.`);
            }
            return true;
        }),
];

const resolveCategoryForBudget = async (req, res, next) => {
    try {
        const { categoryId } = req.body;
        const category = await categoryRepository.findCategoryById(categoryId);
        if (!category) return next(new BadRequest('Validation failed.', { categoryId: 'Category could not found.' }));
        if (category.userId !== req.user.sub) return next(new BadRequest('Validation failed.', { categoryId: 'Category does not belong to you.' }));
        if (category.type !== 'expense') return next(new BadRequest('Validation failed.', { categoryId: 'Only expense categories can have budgets.' }));
        req.category = category;
        next();
    } catch (error) {
        next(error);
    }
};

const budgetUniqueValidator = async (req, res, next) => {
    try {
        const { categoryId, month, year } = req.body;
        const existing = await budgetRepository.findBudgetByUserCategoryMonthYear(
            req.user.sub,
            categoryId,
            parseInt(month, 10),
            parseInt(year, 10),
        );
        if (existing) return next(new Conflict('A budget already exists for this category, month, and year.'));
        next();
    } catch (error) {
        next(error);
    }
};

const resolveBudgetMiddleware = async (req, res, next) => {
    try {
        const budget = await budgetRepository.findBudgetById(req.params.id);
        if (!budget) return next(new NotFound('Budget not found.'));
        if (budget.userId !== req.user.sub) return next(new PermissionDenied());
        req.budget = budget;
        next();
    } catch (error) {
        next(error);
    }
};

module.exports = {
    categoryIdFieldValidator,
    amountFieldValidator,
    monthFieldValidator,
    yearFieldValidator,
    listBudgetsQueryValidator,
    resolveCategoryForBudget,
    budgetUniqueValidator,
    resolveBudgetMiddleware,
};
