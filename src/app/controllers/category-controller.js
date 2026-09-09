'use strict';

const { ApiResponse } = require('../../utils/responses');
const categoryRepository = require('../../repositories/category-repository');
const categorySerializer = require('../../utils/serializers/category-serializer');

/** * Lists all categories for a user.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @param {Function} next - The next function.
 * @returns {Promise<void>} - A promise that resolves to the list of categories.
 */
const listCategoriesController = async (req, res, next) => {
    try {
        const categories = await categoryRepository.findUserCategories(req.user.sub);
        const apiResponse = new ApiResponse();
        apiResponse.message = 'Categories retrieved successfully.';
        apiResponse.data = categorySerializer.serializeCategoryList(categories);
        return res.status(200).json(apiResponse);
    } catch (error) {
        next(error);
    }
};

/** * Creates a new category.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @param {Function} next - The next function.
 * @returns {Promise<void>} - A promise that resolves to the created category.
 */
const createCategoryController = async (req, res, next) => {
    try {
        const { name, type } = req.body;
        const category = await categoryRepository.createCategory({ userId: req.user.sub, name, type });
        const apiResponse = new ApiResponse();
        apiResponse.message = 'Category created successfully.';
        apiResponse.data = categorySerializer.serializeCategory(category);
        return res.status(201).json(apiResponse);
    } catch (error) {
        next(error);
    }
};

/** * Updates a category.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @param {Function} next - The next function.
 * @returns {Promise<void>} - A promise that resolves to the updated category.
 */
const updateCategoryController = async (req, res, next) => {
    try {
        const updated = await categoryRepository.updateCategory(req.params.id, { name: req.body.name });
        const apiResponse = new ApiResponse();
        apiResponse.message = 'Category updated successfully.';
        apiResponse.data = categorySerializer.serializeCategory(updated);
        return res.status(200).json(apiResponse);
    } catch (error) {
        next(error);
    }
};

/** * Deletes a category.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @param {Function} next - The next function.
 * @returns {Promise<void>} - A promise that resolves to the deleted category.
 */
const deleteCategoryController = async (req, res, next) => {
    try {
        await categoryRepository.deleteCategory(req.category.id);
        const apiResponse = new ApiResponse();
        apiResponse.message = 'Category deleted successfully.';
        return res.status(200).json(apiResponse);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    listCategoriesController,
    createCategoryController,
    updateCategoryController,
    deleteCategoryController,
};
