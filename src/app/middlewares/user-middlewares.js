'use strict';

const { isUserAuthenticated } = require("./authorization-middlewares");

const getUserMiddlewares = [ isUserAuthenticated ];

module.exports = { getUserMiddlewares }
