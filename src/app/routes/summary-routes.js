'use strict';

const express = require('express');
const { getMonthlySummaryController } = require('../controllers/summary-controller');
const { monthlySummaryMiddleware } = require('../middlewares/summary-middlewares');

const router = express.Router();

router.get('/monthly', monthlySummaryMiddleware, getMonthlySummaryController);

module.exports = router;
