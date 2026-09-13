'use strict';

const { handleBadRequests } = require('../../utils/exceptions/exception-handler');
const { TransactionFilterService, TRANSACTION_FILTER_CONFIG } = require('../../utils/filters/transaction-filter-service');
const {
    amountFieldValidator,
    typeFieldValidator,
    categoryIdFieldValidator,
    dateFieldValidator,
    descriptionFieldValidator,
    resolveCategoryForTransaction,
    resolveTransactionMiddleware,
    amountFieldOptionalValidator,
    typeFieldOptionalValidator,
    categoryIdFieldOptionalValidator,
    dateFieldOptionalValidator,
    resolveCategoryForTransactionUpdate,
    listTransactionsQueryValidator
} = require('../../utils/validators/transaction-validators');

/** * Creates a new transaction.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @param {Function} next - The next function.
 * @returns {Promise<void>} - A promise that resolves to the created transaction.
 */
const createTransactionMiddleware = [
    amountFieldValidator,
    typeFieldValidator,
    categoryIdFieldValidator,
    dateFieldValidator,
    descriptionFieldValidator,
    handleBadRequests('Error occurred while creating transaction.'),
    resolveCategoryForTransaction,
];

/** * Retrieves a transaction by its ID.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @param {Function} next - The next function.
 * @returns {Promise<void>} - A promise that resolves to the retrieved transaction.
 */
const getTransactionMiddleware = [
    resolveTransactionMiddleware,
];

const updateTransactionMiddleware = [
    amountFieldOptionalValidator,
    typeFieldOptionalValidator,
    categoryIdFieldOptionalValidator,
    dateFieldOptionalValidator,
    descriptionFieldValidator,
    handleBadRequests('Error occurred while updating transaction.'),
    resolveTransactionMiddleware,
    resolveCategoryForTransactionUpdate,
];

const deleteTransactionMiddleware = [
    resolveTransactionMiddleware,
];

const listTransactionsMiddleware = [
    ...listTransactionsQueryValidator,
    handleBadRequests('Error occurred while retrieving transactions.'),
    (req, res, next) => {
        const filterService = new TransactionFilterService(TRANSACTION_FILTER_CONFIG);
        const { where, filters } = filterService.processFilters(req.query);
        req.where = where;
        req.filters = filters;
        next();
    },
];

module.exports = { 
    createTransactionMiddleware, 
    getTransactionMiddleware, 
    updateTransactionMiddleware, 
    deleteTransactionMiddleware, 
    listTransactionsMiddleware 
};
