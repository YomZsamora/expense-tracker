'use strict';

const express = require('express');
const { 
    createTransactionMiddleware, 
    getTransactionMiddleware, 
    updateTransactionMiddleware, 
    deleteTransactionMiddleware, 
    listTransactionsMiddleware 
} = require('../middlewares/transaction-middlewares');
const { 
    createTransactionController, 
    getTransactionController, 
    updateTransactionController, 
    deleteTransactionController, 
    listTransactionsController 
} = require('../controllers/transaction-controller');

const router = express.Router();

router.post('/', createTransactionMiddleware, createTransactionController);
router.get('/', listTransactionsMiddleware, listTransactionsController);
router.get('/:id', getTransactionMiddleware, getTransactionController);
router.patch('/:id', updateTransactionMiddleware, updateTransactionController);
router.delete('/:id', deleteTransactionMiddleware, deleteTransactionController);

module.exports = router;
