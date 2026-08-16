const { User } = require('../models/user');

const registerUser = async ({ name, email, password }) => {
    return User.create({ name, email, passwordHash: password });
};

const findUserByEmail = async (email) => {
    return User.findOne({
        where: { email: email.trim().toLowerCase() },
        attributes: ['id', 'name', 'email', 'passwordHash'],
    });
};

const findUserById = async (id) => {
    return User.findByPk(id, {
        attributes: ['id', 'name', 'email'],
    });
};

const userEmailExists = async (email) => {
    const user = await User.findOne({
        where: { email: email.trim().toLowerCase() },
        attributes: ['email'],
    });
    return !!user;
};

module.exports = { registerUser, findUserByEmail, findUserById, userEmailExists };
