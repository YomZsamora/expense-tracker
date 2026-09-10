const express = require('express');
const dotenv = require('dotenv');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('./configs/sequelize');
require('./models/associations');
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

app.get('/health', (req, res) => res.send('The expense tracker is running.'));
app.use('/v1/auth/', authRoutes);
app.use('/v1/users/', isUserAuthenticated, userRoutes);
app.use('/v1/categories/', isUserAuthenticated, categoryRoutes);
app.use('/v1/transactions/', isUserAuthenticated, transactionRoutes);

app.use(exceptionHandler);

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}

module.exports = app;
