const ShopCategory = require('../models/ShopCategory');
const logger = require('../utils/logger');

exports.createCategory = async (req, res, next) => {
  try {
    const { shopId, name, parentId } = req.body;

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    const existingCategory = await ShopCategory.findOne({ shopId, slug });
    if (existingCategory) {
      return res.status(400).json({ success: false, message: 'Category already exists' });
    }

    const category = await ShopCategory.create({
      ...req.body,
      slug,
    });

    logger.info(`Category created: ${category._id}`);
    res.status(201).json({ success: true, data: category });
  } catch (error) {
    logger.error(`Create category error: ${error.message}`);
    next(error);
  }
};

exports.getCategories = async (req, res, next) => {
  try {
    const { shopId, parentId } = req.query;

    const query = { shopId };
    if (parentId) {
      query.parentId = parentId;
    } else if (parentId !== undefined) {
      query.parentId = null;
    }

    const categories = await ShopCategory.find(query)
      .sort({ order: 1, name: 1 })
      .populate('parentId', 'name slug');

    res.json({ success: true, data: categories });
  } catch (error) {
    logger.error(`Get categories error: ${error.message}`);
    next(error);
  }
};

exports.getCategoryById = async (req, res, next) => {
  try {
    const category = await ShopCategory.findById(req.params.id)
      .populate('parentId', 'name slug');

    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    res.json({ success: true, data: category });
  } catch (error) {
    logger.error(`Get category error: ${error.message}`);
    next(error);
  }
};

exports.updateCategory = async (req, res, next) => {
  try {
    const category = await ShopCategory.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    logger.info(`Category updated: ${category._id}`);
    res.json({ success: true, data: category });
  } catch (error) {
    logger.error(`Update category error: ${error.message}`);
    next(error);
  }
};

exports.deleteCategory = async (req, res, next) => {
  try {
    const category = await ShopCategory.findById(req.params.id);

    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    const hasChildren = await ShopCategory.countDocuments({ parentId: category._id });
    if (hasChildren > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete category with subcategories',
      });
    }

    await ShopCategory.findByIdAndDelete(req.params.id);

    logger.info(`Category deleted: ${category._id}`);
    res.json({ success: true, message: 'Category deleted successfully' });
  } catch (error) {
    logger.error(`Delete category error: ${error.message}`);
    next(error);
  }
};
