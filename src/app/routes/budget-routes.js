'use strict';

const express = require('express');
const { createBudgetController } = require('../controllers/budget-controller');
const { createBudgetMiddleware } = require('../middlewares/budget-middlewares');

const router = express.Router();

router.post('/', createBudgetMiddleware, createBudgetController);

module.exports = router;
