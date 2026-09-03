const { findUserById } = require("../../repositories/user-repository");
const { NotFound } = require("../../utils/exceptions/custom-exceptions");
const { ApiResponse } = require("../../utils/responses");
const { serializeUser } = require("../../utils/serializers/user-serializer");


const getUserController = async (req, res, next) => {

    try {
        const userId = req.user.sub;
        const user = await findUserById(userId);
        if (!user) return next(new NotFound('The requested user could not be found.'));
        const apiResponse = new ApiResponse();
        apiResponse.message = 'User retrieved successfully.';
        apiResponse.data = serializeUser(user);
        return res.status(200).json(apiResponse);
    } catch (error) {
        next(error)
    }
}

module.exports = { getUserController }
