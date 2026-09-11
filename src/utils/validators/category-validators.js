'use strict';

const { body } = require('express-validator');
const { NotFound, Conflict, PermissionDenied } = require('../exceptions/custom-exceptions');
const categoryRepository = require('../../repositories/category-repository');

const nameFieldValidator = body('name')
    .trim()
    .notEmpty().withMessage('Name is required.')
    .isLength({ min: 2 }).withMessage('Name must be at least 2 characters.')
    .isLength({ max: 100 }).withMessage('Name cannot exceed 100 characters.');

const typeFieldValidator = body('type')
    .notEmpty().withMessage('Type is required.')
    .isIn(['income', 'expense']).withMessage('Type must be income or expense.');

const resolveCategoryMiddleware = async (req, res, next) => {
    try {
        const category = await categoryRepository.findCategoryById(req.params.id);
        if (!category) return next(new NotFound('The requested category could not found.'));
        if (category.userId !== req.user.sub) return next(new PermissionDenied());
        req.category = category;
        next();
    } catch (error) {
        next(error);
    }
};

const categoryUniqueValidator = async (req, res, next) => {
    try {
        const userId = req.user.sub;
        const name = req.body.name;
        // PATCH: type cannot change, so use the resolved category's type
        const type = req.category ? req.category.type : req.body.type;
        const existing = await categoryRepository.findCategoryByNameAndType(userId, name, type);
        if (existing && existing.id !== req.params?.id) {
            return next(new Conflict(`A ${type} category named "${name}" already exists.`));
        }
        next();
    } catch (error) {
        next(error);
    }
};

const categoryDeletableValidator = async (req, res, next) => {
    try {
        if (req.category.isDefault) {
            return next(new PermissionDenied('Default categories cannot be deleted.'));
        }
        const hasTransactions = await categoryRepository.hasActiveTransactions(req.category.id);
        if (hasTransactions) {
            return next(new Conflict('Cannot delete a category with active transactions.'));
        }
        next();
    } catch (error) {
        next(error);
    }
};

module.exports = {
    nameFieldValidator,
    typeFieldValidator,
    resolveCategoryMiddleware,
    categoryUniqueValidator,
    categoryDeletableValidator,
};
