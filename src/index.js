const cors = require('cors');
require('./configs/sequelize');
require('./models/associations');
const dotenv = require('dotenv');
const helmet = require('helmet');
const express = require('express');
const cookieParser = require('cookie-parser');
const authRoutes = require('./app/routes/auth-routes');
const userRoutes = require('./app/routes/user-routes');
const categoryRoutes = require('./app/routes/category-routes');
const transactionRoutes = require('./app/routes/transaction-routes');
const { exceptionHandler } = require('./utils/exceptions/exception-handler');
const { isUserAuthenticated } = require('./app/middlewares/authorization-middlewares');

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(cookieParser());

// Health check route
app.get('/health', (req, res) => res.send('The Expense Tracker API is running.'));

// Public routes
app.use('/v1/auth/', authRoutes);

// Protected routes
app.use(isUserAuthenticated);
app.use('/v1/users/', userRoutes);
app.use('/v1/categories/', categoryRoutes);
app.use('/v1/transactions/', transactionRoutes);

// Exception handler
app.use(exceptionHandler);

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}

module.exports = app;
