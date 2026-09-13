'use strict';

const express = require('express');
const { listBudgetsController, createBudgetController, updateBudgetController, deleteBudgetController } = require('../controllers/budget-controller');
const { listBudgetsMiddleware, createBudgetMiddleware, updateBudgetMiddleware, deleteBudgetMiddleware } = require('../middlewares/budget-middlewares');

const router = express.Router();

router.get('/', listBudgetsMiddleware, listBudgetsController);
router.post('/', createBudgetMiddleware, createBudgetController);
router.patch('/:id', updateBudgetMiddleware, updateBudgetController);
router.delete('/:id', deleteBudgetMiddleware, deleteBudgetController);

module.exports = router;
