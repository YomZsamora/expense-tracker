'use strict';

const express = require('express');
const { createBudgetController, updateBudgetController, deleteBudgetController } = require('../controllers/budget-controller');
const { createBudgetMiddleware, updateBudgetMiddleware, deleteBudgetMiddleware } = require('../middlewares/budget-middlewares');

const router = express.Router();

router.post('/', createBudgetMiddleware, createBudgetController);
router.patch('/:id', updateBudgetMiddleware, updateBudgetController);
router.delete('/:id', deleteBudgetMiddleware, deleteBudgetController);

module.exports = router;
