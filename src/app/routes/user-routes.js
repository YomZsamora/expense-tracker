const express = require('express');
const { getUserMiddlewares } = require('../middlewares/user-middlewares');
const { getUserController } = require('../controllers/user-controllers');

const router = express.Router();

router.get('/me', getUserMiddlewares, getUserController);

module.exports = router;
