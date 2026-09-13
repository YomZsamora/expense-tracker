'use strict';

const { handleBadRequests } = require('../../utils/exceptions/exception-handler');
const { monthlySummaryQueryValidator } = require('../../utils/validators/summary-validators');

/** * Middleware for validating the monthly summary query parameters.
 * It uses the monthlySummaryQueryValidator to check the 'month' and 'year' query parameters.
 * If validation fails, it handles the bad requests with a specific error message.
 */
const monthlySummaryMiddleware = [
    ...monthlySummaryQueryValidator,
    handleBadRequests('Error occurred while retrieving monthly summary.'),
];

module.exports = { monthlySummaryMiddleware };
