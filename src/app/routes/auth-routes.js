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
} = require('../controllers/auth-controllers');

const router = express.Router();

router.post('/register', basicRegistrationMiddleware, basicRegistrationController);
router.post('/login', basicLoginMiddleware, basicLoginController);
router.post('/refresh', refreshTokenMiddleware, refreshTokenController);
router.post('/logout', logoutController);

module.exports = router;
