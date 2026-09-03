
const serializeCategory = (category) => ({
    categoryId: category.id,
    name: category.name,
    type: category.type,
    isDefault: category.isDefault,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
});

const serializeCategoryList = (categories) => categories.map(serializeCategory);

module.exports = { serializeCategory, serializeCategoryList };
