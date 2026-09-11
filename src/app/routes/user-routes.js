'use strict';

const express = require('express');
const { 
    getUserController,
    logoutController
} = require('../controllers/user-controllers');

const router = express.Router();

router.get('/me', getUserController);
router.post('/logout', logoutController);

module.exports = router;
