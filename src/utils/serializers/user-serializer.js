const serializeUser = (user) => ({
    userId: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
});

const serializeAuthUser = (user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
});

module.exports = { serializeUser, serializeAuthUser };
