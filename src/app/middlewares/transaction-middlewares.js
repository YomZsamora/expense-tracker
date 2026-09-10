'use strict';

const { handleBadRequests } = require('../../utils/exceptions/exception-handler');
const {
    amountFieldValidator,
    typeFieldValidator,
    categoryIdFieldValidator,
    dateFieldValidator,
    descriptionFieldValidator,
    resolveCategoryForTransaction,
    resolveTransactionMiddleware,
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

module.exports = { createTransactionMiddleware, getTransactionMiddleware };
