'use strict';

const { query } = require('express-validator');

/** * Validator for the monthly summary query parameters.
 * Ensures that 'month' is an integer between 1 and 12, and 'year' is an integer of 2000 or later.
 */
const monthlySummaryQueryValidator = [
    query('month')
        .optional()
        .isInt({ min: 1, max: 12 }).withMessage('Month must be an integer between 1 and 12.'),
    query('year')
        .optional()
        .isInt({ min: 2000 }).withMessage('Year must be 2000 or later.'),
];

const trendsQueryValidator = [
    query('months')
        .optional()
        .isInt({ min: 1, max: 12 }).withMessage('Months must be an integer between 1 and 12.'),
];

module.exports = { monthlySummaryQueryValidator, trendsQueryValidator };
