'use strict';

const { Op } = require('sequelize');

const TRANSACTION_FILTER_CONFIG = {
    type: {
        field: 'type',
        op: Op.eq,
        values: ['income', 'expense'],
    },
    categoryId: {
        field: 'categoryId',
        op: Op.eq,
    },
    startDate: {
        field: 'date',
        op: Op.gte,
    },
    endDate: {
        field: 'date',
        op: Op.lte,
    },
    search: {
        field: 'description',
        op: Op.iLike,
        transform: (v) => `%${v}%`,
    },
};

class TransactionFilterService {

    constructor(config) {
        this.config = config;
    }

    processFilters(queryParams) {
        const where = {};
        const appliedFilters = {};
        for (const [key, cfg] of Object.entries(this.config)) {
            const raw = queryParams[key];
            if (raw === undefined || raw === '') continue;
            if (cfg.values && !cfg.values.includes(raw)) continue;
            const value = cfg.transform ? cfg.transform(raw) : raw;
            const field = cfg.field;

            if (where[field] && typeof where[field] === 'object') {
                where[field][cfg.op] = value;
            } else if (cfg.op === Op.gte || cfg.op === Op.lte) {
                where[field] = { ...(where[field] || {}), [cfg.op]: value };
            } else {
                where[field] = { [cfg.op]: value };
            }
            appliedFilters[key] = raw;
        }
        return { where, filters: appliedFilters };
    }
}

module.exports = { TransactionFilterService, TRANSACTION_FILTER_CONFIG };
