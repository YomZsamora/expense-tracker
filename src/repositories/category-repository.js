
const { Category } = require('../models/category');
const { Transaction } = require('../models/transaction');

const DEFAULT_CATEGORIES = [
    { name: 'Food & Dining',  type: 'expense', isDefault: true },
    { name: 'Transport',       type: 'expense', isDefault: true },
    { name: 'Rent & Housing',  type: 'expense', isDefault: true },
    { name: 'Utilities',       type: 'expense', isDefault: true },
    { name: 'Entertainment',   type: 'expense', isDefault: true },
    { name: 'Healthcare',      type: 'expense', isDefault: true },
    { name: 'Shopping',        type: 'expense', isDefault: true },
    { name: 'Education',       type: 'expense', isDefault: true },
    { name: 'Salary',          type: 'income',  isDefault: true },
    { name: 'Freelance',       type: 'income',  isDefault: true },
    { name: 'Business',        type: 'income',  isDefault: true },
    { name: 'Other Income',    type: 'income',  isDefault: true },
];

const seedDefaultCategories = async (userId, options = {}) => {
    const rows = DEFAULT_CATEGORIES.map((c) => ({ ...c, userId }));
    return Category.bulkCreate(rows, options);
};

const findUserCategories = async (userId) => {
    return Category.findAll({ where: { userId }, order: [['name', 'ASC']] });
};

const findCategoryById = async (id) => {
    return Category.findByPk(id);
};

const findCategoryByNameAndType = async (userId, name, type) => {
    return Category.findOne({ where: { userId, name, type } });
};

const createCategory = async ({ userId, name, type }) => {
    return Category.create({ userId, name, type, isDefault: false });
};

const updateCategory = async (id, { name }) => {
    const [, [updated]] = await Category.update({ name }, { where: { id }, returning: true });
    return updated;
};

const deleteCategory = async (id) => {
    return Category.destroy({ where: { id } });
};

const hasActiveTransactions = async (categoryId) => {
    const count = await Transaction.count({ where: { categoryId } });
    return count > 0;
};

module.exports = {
    seedDefaultCategories,
    findUserCategories,
    findCategoryById,
    findCategoryByNameAndType,
    createCategory,
    updateCategory,
    deleteCategory,
    hasActiveTransactions,
};
