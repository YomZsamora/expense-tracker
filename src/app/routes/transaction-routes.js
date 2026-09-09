'use strict';

const express = require('express');
const { createTransactionMiddleware, getTransactionMiddleware } = require('../middlewares/transaction-middlewares');
const { createTransactionController, getTransactionController } = require('../controllers/transaction-controller');

const router = express.Router();

router.post('/', createTransactionMiddleware, createTransactionController);
router.get('/:id', getTransactionMiddleware, getTransactionController);

module.exports = router;
