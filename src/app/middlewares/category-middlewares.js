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

/** * Lists all categories for a user.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @param {Function} next - The next function.
 * @returns {Promise<void>} - A promise that resolves to the list of categories.
 */
const listCategoryMiddleware = [isUserAuthenticated];

/** * Creates a new category.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @param {Function} next - The next function.
 * @returns {Promise<void>} - A promise that resolves to the created category.
 */
const createCategoryMiddleware = [
    isUserAuthenticated,
    nameFieldValidator,
    typeFieldValidator,
    handleBadRequests('Error occurred while creating category.'),
    categoryUniqueValidator,
];

/** * Updates a category.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @param {Function} next - The next function.
 * @returns {Promise<void>} - A promise that resolves to the updated category.
 */
const updateCategoryMiddleware = [
    isUserAuthenticated,
    nameFieldValidator,
    handleBadRequests('Error occurred while updating category.'),
    resolveCategoryMiddleware,
    categoryUniqueValidator,
];

/** * Deletes a category.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @param {Function} next - The next function.
 * @returns {Promise<void>} - A promise that resolves to the deleted category.
 */
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
