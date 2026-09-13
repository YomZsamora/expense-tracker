'use strict';

/** * Serializes the monthly summary data into a structured format.
 *
 * @param {Object} summaryData - The summary data containing categoryRows and budgets.
 * @param {Array} summaryData.categoryRows - The rows of category data.
 * @param {Array} summaryData.budgets - The budgets for the specified month and year.
 * @param {number} month - The month for which the summary is generated.
 * @param {number} year - The year for which the summary is generated.
 * @returns {Object} The serialized monthly summary.
 */
const serializeMonthlySummary = ({ categoryRows, budgets, month, year }) => {
    let totalIncome = 0;
    let totalExpenses = 0;

    const categories = categoryRows.map((row) => {
        const total = parseFloat(row.total) || 0;
        const count = parseInt(row.count, 10) || 0;

        if (row.categoryType === 'income') totalIncome += total;
        else totalExpenses += total;

        const budget = budgets.find((b) => b.categoryId === row.categoryId);
        let budgetInfo = null;
        if (budget) {
            const limit = parseFloat(budget.amount);
            const remaining = parseFloat((limit - total).toFixed(2));
            const percentage = parseFloat(((total / limit) * 100).toFixed(1));
            budgetInfo = { limit, remaining, percentage };
        }

        return {
            categoryId: row.categoryId,
            name: row.categoryName,
            type: row.categoryType,
            total,
            count,
            budget: budgetInfo,
        };
    });

    return {
        period: { month, year },
        totals: {
            income: parseFloat(totalIncome.toFixed(2)),
            expenses: parseFloat(totalExpenses.toFixed(2)),
            net: parseFloat((totalIncome - totalExpenses).toFixed(2)),
        },
        categories,
    };
};

const serializeMonthlyTrends = ({ periods, rows, months }) => {
    const trends = periods.map(({ month, year }) => {
        const incomeRow = rows.find((r) => r.month === month && r.year === year && r.type === 'income');
        const expenseRow = rows.find((r) => r.month === month && r.year === year && r.type === 'expense');
        const income = parseFloat(parseFloat(incomeRow ? incomeRow.total : 0).toFixed(2));
        const expenses = parseFloat(parseFloat(expenseRow ? expenseRow.total : 0).toFixed(2));
        return {
            period: { month, year },
            totals: {
                income,
                expenses,
                net: parseFloat((income - expenses).toFixed(2)),
            },
        };
    });

    return { months, trends };
};

module.exports = { serializeMonthlySummary, serializeMonthlyTrends };
