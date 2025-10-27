const ShopProduct = require('../models/ShopProduct');
const { publishEvent } = require('../config/rabbitmq');
const logger = require('../utils/logger');

exports.addProduct = async (req, res, next) => {
  try {
    const product = await ShopProduct.create(req.body);

    await publishEvent('shop.product_added', {
      shopId: product.shopId,
      productId: product.productId,
      timestamp: new Date(),
    });

    logger.info(`Product added to shop: ${product._id}`);
    res.status(201).json({ success: true, data: product });
  } catch (error) {
    logger.error(`Add product error: ${error.message}`);
    next(error);
  }
};

exports.getProducts = async (req, res, next) => {
  try {
    const { shopId, categoryId, status, featured, page = 1, limit = 20 } = req.query;

    const query = {};
    if (shopId) query.shopId = shopId;
    if (categoryId) query.categoryId = categoryId;
    if (status) query.status = status;
    if (featured !== undefined) query.featured = featured === 'true';

    const products = await ShopProduct.find(query)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ order: 1, createdAt: -1 })
      .populate('categoryId', 'name slug');

    const count = await ShopProduct.countDocuments(query);

    res.json({
      success: true,
      data: products,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      total: count,
    });
  } catch (error) {
    logger.error(`Get products error: ${error.message}`);
    next(error);
  }
};

exports.getProductById = async (req, res, next) => {
  try {
    const product = await ShopProduct.findById(req.params.id)
      .populate('categoryId', 'name slug');

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    res.json({ success: true, data: product });
  } catch (error) {
    logger.error(`Get product error: ${error.message}`);
    next(error);
  }
};

exports.updateProduct = async (req, res, next) => {
  try {
    const product = await ShopProduct.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    await publishEvent('shop.product_updated', {
      shopId: product.shopId,
      productId: product.productId,
      changes: req.body,
      timestamp: new Date(),
    });

    logger.info(`Product updated: ${product._id}`);
    res.json({ success: true, data: product });
  } catch (error) {
    logger.error(`Update product error: ${error.message}`);
    next(error);
  }
};

exports.deleteProduct = async (req, res, next) => {
  try {
    const product = await ShopProduct.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    await ShopProduct.findByIdAndDelete(req.params.id);

    await publishEvent('shop.product_removed', {
      shopId: product.shopId,
      productId: product.productId,
      timestamp: new Date(),
    });

    logger.info(`Product deleted: ${product._id}`);
    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    logger.error(`Delete product error: ${error.message}`);
    next(error);
  }
};

exports.updateStock = async (req, res, next) => {
  try {
    const { stock } = req.body;

    const product = await ShopProduct.findByIdAndUpdate(
      req.params.id,
      { stock },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    if (stock <= product.lowStockThreshold) {
      await publishEvent('shop.product_low_stock', {
        shopId: product.shopId,
        productId: product.productId,
        stock,
        threshold: product.lowStockThreshold,
        timestamp: new Date(),
      });
    }

    res.json({ success: true, data: product });
  } catch (error) {
    logger.error(`Update stock error: ${error.message}`);
    next(error);
  }
};
