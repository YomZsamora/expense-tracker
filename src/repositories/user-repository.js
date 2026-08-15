const { Op } = require('sequelize');
const { User } = require('../models/user');

/**
 * Registers a new user in the database.
 * @param {Object} userData - The user data containing email, password, and optional role.
 * @returns {Promise<Object>} - The created user object.
 */
const registerUser = async ({ email, password, role = 'USER' }) => {
    return User.create({ email, password, role });
};

/**
 * Finds a user by their email address.
 * @param {string} email - The email address of the user to find.
 * @returns {Promise<Object|null>} - The found user object or null if not found.
 */
const findUserByEmail = async (email) => {
    return User.findOne({
        where: {
            email: email.trim().toLowerCase()
        },
        attributes: ['id', 'email', 'role']
    });
};

/** * Finds a user by their unique identifier (ID).
 * @param {string} id - The unique identifier of the user to find.
 * @returns {Promise<Object|null>} - The found user object or null if not found.
 */
const findUserById = async (id) => {
    return User.findByPk(id, {
        attributes: ['id', 'email', 'role']
    });
};

const userEmailExists = async (email) => {
    const user = await User.findOne({
        where: { email: email.trim().toLowerCase() },
        attributes: ['email'],
    });
    return !!user;
}

const findUsersByIds = async (ids) => {
    return User.findAll({
        where: { id: { [Op.in]: ids } },
        attributes: ['id', 'role'],
    });
};

module.exports = {
    registerUser,
    findUserByEmail,
    findUserById,
    userEmailExists,
    findUsersByIds,
};
