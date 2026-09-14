'use strict';

const { handleBadRequests } = require('../../utils/exceptions/exception-handler');
const { monthlySummaryQueryValidator, trendsQueryValidator, categoryBreakdownQueryValidator } = require('../../utils/validators/summary-validators');

const monthlySummaryMiddleware = [
    ...monthlySummaryQueryValidator,
    handleBadRequests('Error occurred while retrieving monthly summary.'),
];

const trendsMiddleware = [
    ...trendsQueryValidator,
    handleBadRequests('Error occurred while retrieving monthly trends.'),
];

const categoryBreakdownMiddleware = [
    ...categoryBreakdownQueryValidator,
    handleBadRequests('Error occurred while retrieving category breakdown.'),
];

module.exports = { monthlySummaryMiddleware, trendsMiddleware, categoryBreakdownMiddleware };
