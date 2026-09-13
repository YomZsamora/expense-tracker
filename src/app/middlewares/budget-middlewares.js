'use strict';

const { handleBadRequests } = require('../../utils/exceptions/exception-handler');
const {
    categoryIdFieldValidator,
    amountFieldValidator,
    monthFieldValidator,
    yearFieldValidator,
    resolveCategoryForBudget,
    budgetUniqueValidator,
    resolveBudgetMiddleware,
} = require('../../utils/validators/budget-validators');

const createBudgetMiddleware = [
    categoryIdFieldValidator,
    amountFieldValidator,
    monthFieldValidator,
    yearFieldValidator,
    handleBadRequests('Error occurred while creating budget.'),
    resolveCategoryForBudget,
    budgetUniqueValidator,
];

const updateBudgetMiddleware = [
    amountFieldValidator,
    handleBadRequests('Error occurred while updating budget.'),
    resolveBudgetMiddleware,
];

const deleteBudgetMiddleware = [
    resolveBudgetMiddleware,
];

module.exports = { createBudgetMiddleware, updateBudgetMiddleware, deleteBudgetMiddleware };
