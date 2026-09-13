'use strict';

const express = require('express');
const { createBudgetController, updateBudgetController } = require('../controllers/budget-controller');
const { createBudgetMiddleware, updateBudgetMiddleware } = require('../middlewares/budget-middlewares');

const router = express.Router();

router.post('/', createBudgetMiddleware, createBudgetController);
router.patch('/:id', updateBudgetMiddleware, updateBudgetController);

module.exports = router;
