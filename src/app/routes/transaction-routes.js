'use strict';

const express = require('express');
const { createTransactionMiddleware, getTransactionMiddleware, updateTransactionMiddleware } = require('../middlewares/transaction-middlewares');
const { createTransactionController, getTransactionController, updateTransactionController } = require('../controllers/transaction-controller');

const router = express.Router();

router.post('/', createTransactionMiddleware, createTransactionController);
router.get('/:id', getTransactionMiddleware, getTransactionController);
router.patch('/:id', updateTransactionMiddleware, updateTransactionController);

module.exports = router;
