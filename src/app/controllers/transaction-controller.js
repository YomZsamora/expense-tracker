'use strict';

const { ApiResponse } = require('../../utils/responses');
const transactionRepository = require('../../repositories/transaction-repository');
const transactionSerializer = require('../../utils/serializers/transaction-serializer');

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

module.exports = { createTransactionController, getTransactionController };
