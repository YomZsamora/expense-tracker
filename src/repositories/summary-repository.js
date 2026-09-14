'use strict';

const { QueryTypes } = require('sequelize');
const sequelize = require('../configs/sequelize');
const { Budget } = require('../models/budget');

/**
 * Get monthly trends for a user over a specified number of months.
 * @param {number} userId - The ID of the user.
 * @param {number} months - The number of months to retrieve trends for.
 * @returns {Promise<{ periods: Array<{ month: number, year: number }>, rows: Array<{ month: number, year: number, type: string, total: number }> }>} - An object containing the periods and the corresponding transaction data.
 */
const getMonthlyTrends = async (userId, months) => {
    const periods = [];
    const now = new Date();
    for (let i = months - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        periods.push({ month: d.getMonth() + 1, year: d.getFullYear() });
    }

    // Construct start and end dates for the query
    const startDate = `${periods[0].year}-${String(periods[0].month).padStart(2, '0')}-01`;
    const lastPeriod = periods[periods.length - 1];
    const lastDay = new Date(lastPeriod.year, lastPeriod.month, 0).getDate();
    const endDate = `${lastPeriod.year}-${String(lastPeriod.month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    // Query the database for transaction summaries grouped by month, year, and type
    const rows = await sequelize.query(`
        SELECT
            EXTRACT(MONTH FROM t.date)::int AS month,
            EXTRACT(YEAR  FROM t.date)::int AS year,
            t.type,
            SUM(t.amount) AS total
        FROM transactions t
        WHERE t."userId"    = :userId
          AND t.date        BETWEEN :startDate AND :endDate
          AND t."deletedAt" IS NULL
        GROUP BY EXTRACT(MONTH FROM t.date), EXTRACT(YEAR FROM t.date), t.type
    `, {
        replacements: { userId, startDate, endDate },
        type: QueryTypes.SELECT,
    });

    return { periods, rows };
};

const getMonthlySummary = async (userId, month, year) => {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const categoryRows = await sequelize.query(`
        SELECT
            t."categoryId",
            c.name        AS "categoryName",
            c.type        AS "categoryType",
            SUM(t.amount) AS "total",
            COUNT(t.id)   AS "count"
        FROM transactions t
        JOIN categories c ON t."categoryId" = c.id
        WHERE t."userId"    = :userId
          AND t.date        BETWEEN :startDate AND :endDate
          AND t."deletedAt" IS NULL
        GROUP BY t."categoryId", c.name, c.type
        ORDER BY c.type, c.name
    `, {
        replacements: { userId, startDate, endDate },
        type: QueryTypes.SELECT,
    });

    const budgets = await Budget.findAll({
        where: { userId, month, year },
    });

    return { categoryRows, budgets };
};

const getCategoryBreakdown = async (userId, startDate, endDate) => {
    const rows = await sequelize.query(`
        SELECT
            t."categoryId",
            c.name        AS "categoryName",
            c.type        AS "categoryType",
            SUM(t.amount) AS "total",
            COUNT(t.id)   AS "count"
        FROM transactions t
        JOIN categories c ON t."categoryId" = c.id
        WHERE t."userId"    = :userId
          AND t.date        BETWEEN :startDate AND :endDate
          AND t."deletedAt" IS NULL
        GROUP BY t."categoryId", c.name, c.type
        ORDER BY c.type, c.name
    `, {
        replacements: { userId, startDate, endDate },
        type: QueryTypes.SELECT,
    });

    return rows;
};

module.exports = { getMonthlyTrends, getMonthlySummary, getCategoryBreakdown };
