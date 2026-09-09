'use strict';

const express = require('express');
const {
    basicRegistrationMiddleware,
    basicLoginMiddleware,
    refreshTokenMiddleware
} = require('../middlewares/authentication-middlewares');
const {
    basicRegistrationController,
    basicLoginController,
    refreshTokenController,
    logoutController
} = require('../controllers/authentication-controllers.js');
const { isUserAuthenticated } = require('../middlewares/authorization-middlewares');

const router = express.Router();

router.post('/register', basicRegistrationMiddleware, basicRegistrationController);
router.post('/login', basicLoginMiddleware, basicLoginController);
router.post('/refresh', refreshTokenMiddleware, refreshTokenController);
router.post('/logout', isUserAuthenticated, logoutController);

module.exports = router;
