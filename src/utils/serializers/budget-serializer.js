'use strict';

const serializeBudget = (budget) => ({
    budgetId: budget.id,
    amount: parseFloat(budget.amount),
    month: budget.month,
    year: budget.year,
    category: budget.category ? {
        categoryId: budget.category.id,
        name: budget.category.name,
        type: budget.category.type,
    } : null,
    createdAt: budget.createdAt,
    updatedAt: budget.updatedAt,
});

const serializeBudgetList = (budgets) => budgets.map(serializeBudget);

module.exports = { serializeBudget, serializeBudgetList };
