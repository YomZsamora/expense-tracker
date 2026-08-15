const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const sequelize = require('../configs/sequelize');
const roles = ['ADMIN', 'USER', 'VENUE', 'PERFORMER'];

const User = sequelize.define('User', {

    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },

    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: { isEmail: true },
    },

    password: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    
    role: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'user',
        validate: { isIn: [roles] }
    },
}, {
    tableName: 'users',
    indexes: [
        {
            name: 'idx_users_googleSub',
            unique: true,
            fields: ['googleSub'],
        }
    ],
    hooks: {
        beforeCreate: (user) => {
            if (user.email) user.email = user.email.trim().toLowerCase();
            if (user.password) user.password = hashPassword(user.password);
        }
    }
});

const hashPassword = (password) => {
    const saltRounds = 10;
    return bcrypt.hashSync(password, saltRounds);
};

User.prototype.isValidPassword = function (password) {
    return bcrypt.compareSync(password, this.password); // Compare hashed password with provided password
};

module.exports = { User, roles };
