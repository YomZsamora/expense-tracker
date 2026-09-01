
const serializeTransaction = (transaction) => ({
    id: transaction.id,
    amount: parseFloat(transaction.amount),
    type: transaction.type,
    category: transaction.category ? { 
        id: transaction.category.id, 
        name: transaction.category.name 
    } : null,
    date: transaction.date,
    description: transaction.description ?? null,
    createdAt: transaction.createdAt,
    updatedAt: transaction.updatedAt,
});

const serializeTransactionList = (transactions) => transactions.map(serializeTransaction);

module.exports = { serializeTransaction, serializeTransactionList };
