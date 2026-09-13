'use strict';

const express = require('express');
const { getMonthlySummaryController, getMonthlyTrendsController } = require('../controllers/summary-controller');
const { monthlySummaryMiddleware, trendsMiddleware } = require('../middlewares/summary-middlewares');

const router = express.Router();

router.get('/monthly', monthlySummaryMiddleware, getMonthlySummaryController);
router.get('/trends', trendsMiddleware, getMonthlyTrendsController);

module.exports = router;
