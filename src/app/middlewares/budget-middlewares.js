'use strict';

const { handleBadRequests } = require('../../utils/exceptions/exception-handler');
const {
    categoryIdFieldValidator,
    amountFieldValidator,
    monthFieldValidator,
    yearFieldValidator,
    listBudgetsQueryValidator,
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

const listBudgetsMiddleware = [
    ...listBudgetsQueryValidator,
    handleBadRequests('Error occurred while retrieving budgets.'),
];

const deleteBudgetMiddleware = [
    resolveBudgetMiddleware,
];

module.exports = { createBudgetMiddleware, listBudgetsMiddleware, updateBudgetMiddleware, deleteBudgetMiddleware };
