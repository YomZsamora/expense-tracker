'use strict';

const express = require('express');
const { createTransactionMiddleware, getTransactionMiddleware, updateTransactionMiddleware, deleteTransactionMiddleware } = require('../middlewares/transaction-middlewares');
const { createTransactionController, getTransactionController, updateTransactionController, deleteTransactionController } = require('../controllers/transaction-controller');

const router = express.Router();

router.post('/', createTransactionMiddleware, createTransactionController);
router.get('/:id', getTransactionMiddleware, getTransactionController);
router.patch('/:id', updateTransactionMiddleware, updateTransactionController);
router.delete('/:id', deleteTransactionMiddleware, deleteTransactionController);

module.exports = router;
