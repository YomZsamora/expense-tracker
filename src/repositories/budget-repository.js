'use strict';

const { Budget } = require('../models/budget');
const { Category } = require('../models/category');

const createBudget = async ({ userId, categoryId, amount, month, year }) => {
    return Budget.create({ userId, categoryId, amount, month, year });
};

const findBudgetById = async (id) => {
    return Budget.findByPk(id, {
        include: [{ model: Category, as: 'category', attributes: ['id', 'name', 'type'] }],
    });
};

const findBudgetByUserCategoryMonthYear = async (userId, categoryId, month, year) => {
    return Budget.findOne({ where: { userId, categoryId, month, year } });
};

const updateBudget = async (id, amount) => {
    const [, [updated]] = await Budget.update({ amount }, {
        where: { id },
        returning: true,
    });
    return updated;
};

const findUserBudgets = async (userId, { month, year } = {}) => {
    const where = { userId };
    if (month !== undefined) where.month = month;
    if (year !== undefined) where.year = year;
    return Budget.findAll({
        where,
        include: [{ model: Category, as: 'category', attributes: ['id', 'name', 'type'] }],
        order: [['createdAt', 'DESC']],
    });
};

const deleteBudget = async (id) => {
    return Budget.destroy({ where: { id } });
};

module.exports = {
    createBudget,
    findBudgetById,
    findBudgetByUserCategoryMonthYear,
    updateBudget,
    deleteBudget,
    findUserBudgets,
};
