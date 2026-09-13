'use strict';

const { handleBadRequests } = require('../../utils/exceptions/exception-handler');
const { monthlySummaryQueryValidator, trendsQueryValidator } = require('../../utils/validators/summary-validators');

const monthlySummaryMiddleware = [
    ...monthlySummaryQueryValidator,
    handleBadRequests('Error occurred while retrieving monthly summary.'),
];

const trendsMiddleware = [
    ...trendsQueryValidator,
    handleBadRequests('Error occurred while retrieving monthly trends.'),
];

module.exports = { monthlySummaryMiddleware, trendsMiddleware };
