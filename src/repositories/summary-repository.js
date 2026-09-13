'use strict';

const { QueryTypes } = require('sequelize');
const sequelize = require('../configs/sequelize');
const { Budget } = require('../models/budget');

/**
 * Retrieves the monthly summary for a user, including category totals and budgets.
 *
 * @param {number} userId - The ID of the user.
 * @param {number} month - The month for which to retrieve the summary (1-12).
 * @param {number} year - The year for which to retrieve the summary.
 * @returns {Promise<Object>} An object containing categoryRows and budgets.
 */
const getMonthlySummary = async (userId, month, year) => {
    
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`; // Start date of the month
    const lastDay = new Date(year, month, 0).getDate(); // Get the last day of the month
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`; // End date of the month

    // Query to get the total amount and count of transactions grouped by category for the specified month and year
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

    // Query to get the budgets for the specified month and year
    const budgets = await Budget.findAll({
        where: { userId, month, year },
    });

    return { categoryRows, budgets };
};

module.exports = { getMonthlySummary };
