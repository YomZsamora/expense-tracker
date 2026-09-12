'use strict';

const { ApiResponse } = require('../../utils/responses');
const transactionRepository = require('../../repositories/transaction-repository');
const transactionSerializer = require('../../utils/serializers/transaction-serializer');

/** * Creates a new transaction.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @param {Function} next - The next function.
 * @returns {Promise<void>} - A promise that resolves to the created transaction.
 */
const createTransactionController = async (req, res, next) => {
    try {
        const { amount, type, categoryId, date, description } = req.body;
        const transaction = await transactionRepository.createTransaction({
            userId: req.user.sub,
            amount,
            type,
            categoryId,
            date,
            description,
        });
        const withCategory = await transactionRepository.findTransactionById(transaction.id);
        const apiResponse = new ApiResponse();
        apiResponse.message = 'Transaction created successfully.';
        apiResponse.data = transactionSerializer.serializeTransaction(withCategory);
        return res.status(201).json(apiResponse);
    } catch (error) {
        next(error);
    }
};

/** * Retrieves a transaction by its ID.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @param {Function} next - The next function.
 * @returns {Promise<void>} - A promise that resolves to the retrieved transaction.
 */
const getTransactionController = async (req, res, next) => {
    try {
        const apiResponse = new ApiResponse();
        apiResponse.message = 'Transaction retrieved successfully.';
        apiResponse.data = transactionSerializer.serializeTransaction(req.transaction);
        return res.status(200).json(apiResponse);
    } catch (error) {
        next(error);
    }
};

const updateTransactionController = async (req, res, next) => {
    try {
        const { amount, type, categoryId, date, description } = req.body;
        const updateData = {};
        if (amount !== undefined) updateData.amount = amount;
        if (type !== undefined) updateData.type = type;
        if (categoryId !== undefined) updateData.categoryId = categoryId;
        if (date !== undefined) updateData.date = date;
        if (description !== undefined) updateData.description = description;
        await transactionRepository.updateTransaction(req.transaction.id, updateData);
        const updated = await transactionRepository.findTransactionById(req.transaction.id);
        const apiResponse = new ApiResponse();
        apiResponse.message = 'Transaction updated successfully.';
        apiResponse.data = transactionSerializer.serializeTransaction(updated);
        return res.status(200).json(apiResponse);
    } catch (error) {
        next(error);
    }
};

module.exports = { createTransactionController, getTransactionController, updateTransactionController };
