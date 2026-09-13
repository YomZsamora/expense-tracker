
/**
 * DefaultPaginator class provides utility functions for pagination in API responses.
 * @class   DefaultPaginator        
 * @static  getPaginationParams - Retrieve pagination parameters from the query object or use default values from config.
 * @static  getPaginationMetadata - Calculate pagination metadata based on the total count, current page, and limit.
 */

class DefaultPaginator {

    /**
     * Retrieve pagination parameters from the query object or use default values from config.
     * @param {Object} query - The query object containing page and limit parameters.
     * @param {Object} config - Configuration object with default page and page size values.
     * @returns {Object} An object containing page, limit, and offset based on the query or default values.
     */
    static getPaginationParams(query, config) {
        const page = parseInt(query.page) || config.DEFAULT_PAGE;
        const limit = parseInt(query.limit) || config.DEFAULT_PAGE_SIZE;
        const offset = (page - 1) * limit;
        return { page, limit, offset };
    }

    /**
     * Calculate pagination metadata based on the total count, current page, and limit.
     * @param {number} count - Total number of records/items.
     * @param {number} page - Current page number.
     * @param {number} limit - Number of items per page.
     * @returns {Object} An object containing pagination metadata: currentPage, pageSize,
     *                  totalPages, totalRecords, hasNext, and hasPrevious.
     */
    static getPaginationMetadata(count, page, limit) {
        const totalPages = Math.ceil(count / limit);
        return {
            currentPage: page,
            pageSize: limit,
            totalPages,
            totalRecords: count,
            hasNext: page < totalPages,
            hasPrevious: page > 1
        };
    }
}

module.exports = { DefaultPaginator };
