'use strict';

const express = require('express');
const { getUserController } = require('../controllers/user-controllers');

const router = express.Router();

router.get('/me', getUserController);

module.exports = router;
