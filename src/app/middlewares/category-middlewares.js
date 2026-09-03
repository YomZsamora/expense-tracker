'use strict';

const { handleBadRequests } = require('../../utils/exceptions/exception-handler');
const { isUserAuthenticated } = require('./authorization-middlewares');
const {
    nameFieldValidator,
    typeFieldValidator,
    resolveCategoryMiddleware,
    categoryUniqueValidator,
    categoryDeletableValidator,
} = require('../../utils/validators/category-validators');

const listCategoryMiddleware = [isUserAuthenticated];

const createCategoryMiddleware = [
    isUserAuthenticated,
    nameFieldValidator,
    typeFieldValidator,
    handleBadRequests('Error occurred while creating category.'),
    categoryUniqueValidator,
];

const updateCategoryMiddleware = [
    isUserAuthenticated,
    nameFieldValidator,
    handleBadRequests('Error occurred while updating category.'),
    resolveCategoryMiddleware,
    categoryUniqueValidator,
];

const deleteCategoryMiddleware = [
    isUserAuthenticated,
    resolveCategoryMiddleware,
    categoryDeletableValidator,
];

module.exports = {
    listCategoryMiddleware,
    createCategoryMiddleware,
    updateCategoryMiddleware,
    deleteCategoryMiddleware,
};
