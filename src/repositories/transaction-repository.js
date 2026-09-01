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

const findUserTransactions = async (userId, {
    type,
    categoryId,
    startDate,
    endDate,
    search,
    page = 1,
    limit = 10
}) => {
    const where = { userId };
    if (type) where.type = type;
    if (categoryId) where.categoryId = categoryId;
    if (search) where.description = { [Op.iLike]: `%${search}%` };

    if (startDate || endDate) {
        where.date = {};
        if (startDate) where.date[Op.gte] = startDate;
        if (endDate)   where.date[Op.lte] = endDate;
    }

    const offset = (page - 1) * limit;
    const { count, rows } = await Transaction.findAndCountAll({
        where,
        include: [{ model: Category, as: 'category', attributes: ['id', 'name', 'type'] }],
        order:  [['date', 'DESC']],
        limit,
        offset,
    });

    return {
        transactions: rows,
        pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) },
    };
};

const updateTransaction = async (id, fields) => {
    const [, [updated]] = await Transaction.update(fields, {
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
