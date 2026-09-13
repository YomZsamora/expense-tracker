'use strict';

const { handleBadRequests } = require('../../utils/exceptions/exception-handler');
const {
    categoryIdFieldValidator,
    amountFieldValidator,
    monthFieldValidator,
    yearFieldValidator,
    resolveCategoryForBudget,
    budgetUniqueValidator,
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

module.exports = { createBudgetMiddleware };
