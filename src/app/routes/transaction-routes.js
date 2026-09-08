'use strict';

const express = require('express');
const { createTransactionMiddleware } = require('../middlewares/transaction-middlewares');
const { createTransactionController } = require('../controllers/transaction-controller');

const router = express.Router();

router.post('/', createTransactionMiddleware, createTransactionController);

module.exports = router;
