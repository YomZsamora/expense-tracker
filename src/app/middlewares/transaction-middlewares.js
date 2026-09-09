'use strict';

const { handleBadRequests } = require('../../utils/exceptions/exception-handler');
const { isUserAuthenticated } = require('./authorization-middlewares');
const {
    amountFieldValidator,
    typeFieldValidator,
    categoryIdFieldValidator,
    dateFieldValidator,
    descriptionFieldValidator,
    resolveCategoryForTransaction,
    resolveTransactionMiddleware,
} = require('../../utils/validators/transaction-validators');

const createTransactionMiddleware = [
    isUserAuthenticated,
    amountFieldValidator,
    typeFieldValidator,
    categoryIdFieldValidator,
    dateFieldValidator,
    descriptionFieldValidator,
    handleBadRequests('Error occurred while creating transaction.'),
    resolveCategoryForTransaction,
];

const getTransactionMiddleware = [
    isUserAuthenticated,
    resolveTransactionMiddleware,
];

module.exports = { createTransactionMiddleware, getTransactionMiddleware };
