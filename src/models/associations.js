const { Transaction } = require('./transaction');
const { Category } = require('./category');

Transaction.belongsTo(Category, {
    foreignKey: 'categoryId',
    as: 'category'
});
Category.hasMany(Transaction,   {
    foreignKey: 'categoryId',
    as: 'transactions'
});