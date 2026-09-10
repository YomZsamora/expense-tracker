'use strict';

const express = require('express');
const {
    createCategoryMiddleware,
    updateCategoryMiddleware,
    deleteCategoryMiddleware,
} = require('../middlewares/category-middlewares');
const {
    listCategoriesController,
    createCategoryController,
    updateCategoryController,
    deleteCategoryController,
} = require('../controllers/category-controller');

const router = express.Router();

router.get('/', listCategoriesController);
router.post('/', createCategoryMiddleware, createCategoryController);
router.patch('/:id', updateCategoryMiddleware, updateCategoryController);
router.delete('/:id', deleteCategoryMiddleware, deleteCategoryController);

module.exports = router;
