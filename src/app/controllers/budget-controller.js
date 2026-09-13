'use strict';

const { ApiResponse } = require('../../utils/responses');
const budgetRepository = require('../../repositories/budget-repository');
const budgetSerializer = require('../../utils/serializers/budget-serializer');

const createBudgetController = async (req, res, next) => {
    try {
        const { categoryId, amount, month, year } = req.body;
        const budget = await budgetRepository.createBudget({
            userId: req.user.sub,
            categoryId,
            amount,
            month: parseInt(month, 10),
            year: parseInt(year, 10),
        });
        const withCategory = await budgetRepository.findBudgetById(budget.id);
        const apiResponse = new ApiResponse();
        apiResponse.message = 'Budget created successfully.';
        apiResponse.data = budgetSerializer.serializeBudget(withCategory);
        return res.status(201).json(apiResponse);
    } catch (error) {
        next(error);
    }
};

const updateBudgetController = async (req, res, next) => {
    try {
        const { amount } = req.body;
        await budgetRepository.updateBudget(req.budget.id, amount);
        const updated = await budgetRepository.findBudgetById(req.budget.id);
        const apiResponse = new ApiResponse();
        apiResponse.message = 'Budget updated successfully.';
        apiResponse.data = budgetSerializer.serializeBudget(updated);
        return res.status(200).json(apiResponse);
    } catch (error) {
        next(error);
    }
};

const deleteBudgetController = async (req, res, next) => {
    try {
        await budgetRepository.deleteBudget(req.budget.id);
        return res.status(204).send();
    } catch (error) {
        next(error);
    }
};

module.exports = { createBudgetController, updateBudgetController, deleteBudgetController };
