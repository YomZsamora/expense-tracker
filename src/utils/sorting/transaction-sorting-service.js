'use strict';

const { BadRequest } = require('../../utils/exceptions/custom-exceptions');

const SORT_CONFIG = {
    FIELDS: ['date', 'amount', 'createdAt'],
    DIRECTIONS: ['ASC', 'DESC'],
    DEFAULT_FIELD: 'date',
    DEFAULT_DIRECTION: 'DESC',
};

class TransactionSortingService {
    static getSortingParams(query) {
        const sortBy = query.sortBy || SORT_CONFIG.DEFAULT_FIELD;
        const sortOrder = (query.sortOrder || SORT_CONFIG.DEFAULT_DIRECTION).toUpperCase();

        if (!SORT_CONFIG.FIELDS.includes(sortBy)) {
            throw new BadRequest('Validation failed.', {
                sortBy: `Sort field must be one of: ${SORT_CONFIG.FIELDS.join(', ')}.`,
            });
        }
        if (!SORT_CONFIG.DIRECTIONS.includes(sortOrder)) {
            throw new BadRequest('Validation failed.', {
                sortOrder: 'Sort order must be ASC or DESC.',
            });
        }

        return { sortBy, sortOrder };
    }
}

module.exports = { TransactionSortingService };
