const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const sequelize = require('../configs/sequelize');
const config = require('../configs/config');

const User = sequelize.define(
    'User',
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },

        name: {
            type: DataTypes.STRING(100),
            allowNull: false,
        },

        email: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            validate: { isEmail: true },
        },

        passwordHash: {
            type: DataTypes.STRING,
            allowNull: false,
        },
    },
    {
        tableName: 'users',
        paranoid: true,
        hooks: {
            beforeCreate: (user) => {
                if (user.email) user.email = user.email.trim().toLowerCase();
                if (user.passwordHash) user.passwordHash = hashPassword(user.passwordHash);
            },
        },
    }
);

const hashPassword = (password) => {
    const saltRounds = Number(config.app.BCRYPT_ROUNDS) || 12;
    return bcrypt.hashSync(password, saltRounds);
};

User.prototype.isValidPassword = function (password) {
    return bcrypt.compareSync(password, this.passwordHash);
};

module.exports = { User };
