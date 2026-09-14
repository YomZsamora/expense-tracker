'use strict';

const { query } = require('express-validator');

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

const categoryBreakdownQueryValidator = [
    query('startDate')
        .notEmpty().withMessage('Start date is required.')
        .isISO8601().withMessage('Start date must be a valid date (YYYY-MM-DD).'),
    query('endDate')
        .notEmpty().withMessage('End date is required.')
        .isISO8601().withMessage('End date must be a valid date (YYYY-MM-DD).')
        .custom((endDate, { req }) => {
            const startDate = req.query.startDate;
            if (!startDate) return true;
            if (new Date(endDate) <= new Date(startDate)) {
                throw new Error('End date must be after start date.');
            }
            const diffMs = new Date(endDate) - new Date(startDate);
            const diffDays = diffMs / (1000 * 60 * 60 * 24);
            if (diffDays > 365) {
                throw new Error('Date range cannot exceed 1 year.');
            }
            return true;
        }),
];

module.exports = { monthlySummaryQueryValidator, trendsQueryValidator, categoryBreakdownQueryValidator };
