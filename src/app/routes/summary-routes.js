'use strict';

const express = require('express');
const { getMonthlySummaryController, getMonthlyTrendsController, getCategoryBreakdownController } = require('../controllers/summary-controller');
const { monthlySummaryMiddleware, trendsMiddleware, categoryBreakdownMiddleware } = require('../middlewares/summary-middlewares');

const router = express.Router();

router.get('/monthly', monthlySummaryMiddleware, getMonthlySummaryController);
router.get('/trends', trendsMiddleware, getMonthlyTrendsController);
router.get('/categories', categoryBreakdownMiddleware, getCategoryBreakdownController);

module.exports = router;
