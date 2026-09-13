const { Transaction } = require('../models/transaction');
const { Category } = require('../models/category');
const { Op } = require('sequelize');

const createTransaction = async ({
    userId,
    categoryId,
    amount,
    type,
    date,
    description
}) => {
    return Transaction.create({ userId, categoryId, amount, type, date, description });
};

const findTransactionById = async (id) => {
    return Transaction.findByPk(id, {
        include: [{
            model: Category,
            as: 'category',
            attributes: ['id', 'name', 'type']
        }],
    });
};

const findUserTransactions = async (userId, { where = {}, limit, offset, sortBy, sortOrder }) => {
    const { count, rows } = await Transaction.findAndCountAll({
        where: { ...where, userId },
        include: [{ model: Category, as: 'category', attributes: ['id', 'name', 'type'] }],
        order: [[sortBy, sortOrder]],
        limit,
        offset,
    });
    return { transactions: rows, total: count };
};

const updateTransaction = async (id, updateData) => {
    const [, [updated]] = await Transaction.update(updateData, {
        where: { id },
        returning: true
    });
    return updated;
};

const deleteTransaction = async (id) => {
    return Transaction.destroy({ where: { id } });
};

module.exports = {
    createTransaction,
    findTransactionById,
    findUserTransactions,
    updateTransaction,
    deleteTransaction,
};
