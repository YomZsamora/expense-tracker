const { Transaction } = require('./transaction');
const { Category } = require('./category');
const { Budget } = require('./budget');
const { User } = require('./user');

Transaction.belongsTo(Category, {
    foreignKey: 'categoryId',
    as: 'category'
});
Category.hasMany(Transaction, {
    foreignKey: 'categoryId',
    as: 'transactions'
});

Budget.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user',
});
Budget.belongsTo(Category, {
    foreignKey: 'categoryId',
    as: 'category',
});
User.hasMany(Budget, {
    foreignKey: 'userId',
    as: 'budgets',
});
Category.hasMany(Budget, {
    foreignKey: 'categoryId',
    as: 'budgets',
});