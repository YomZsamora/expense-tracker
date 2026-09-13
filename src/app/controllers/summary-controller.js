'use strict';

const { ApiResponse } = require('../../utils/responses');
const summaryRepository = require('../../repositories/summary-repository');
const summarySerializer = require('../../utils/serializers/summary-serializer');

const getMonthlySummaryController = async (req, res, next) => {
    try {
        const now = new Date();
        const month = req.query.month ? parseInt(req.query.month, 10) : now.getMonth() + 1;
        const year = req.query.year ? parseInt(req.query.year, 10) : now.getFullYear();
        const { categoryRows, budgets } = await summaryRepository.getMonthlySummary(req.user.sub, month, year);
        const apiResponse = new ApiResponse();
        apiResponse.message = 'Monthly summary retrieved successfully.';
        apiResponse.data = summarySerializer.serializeMonthlySummary({ categoryRows, budgets, month, year });
        return res.status(200).json(apiResponse);
    } catch (error) {
        next(error);
    }
};

const getMonthlyTrendsController = async (req, res, next) => {
    try {
        const months = req.query.months ? parseInt(req.query.months, 10) : 6;
        const { periods, rows } = await summaryRepository.getMonthlyTrends(req.user.sub, months);
        const apiResponse = new ApiResponse();
        apiResponse.message = 'Monthly trends retrieved successfully.';
        apiResponse.data = summarySerializer.serializeMonthlyTrends({ periods, rows, months });
        return res.status(200).json(apiResponse);
    } catch (error) {
        next(error);
    }
};

module.exports = { getMonthlySummaryController, getMonthlyTrendsController };
