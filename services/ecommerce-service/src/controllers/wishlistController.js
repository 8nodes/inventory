const Wishlist = require('../models/Wishlist');
const axios = require('axios').default;
const { publishEvent } = require('../config/rabbitmq');
const logger = require('../utils/logger');

const inventoryServiceUrl = process.env.INVENTORY_SERVICE_URL || 'http://inventory-service:8007';

exports.getWishlist = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    let wishlist = await Wishlist.findOne({ userId });

    if (!wishlist) {
      wishlist = await Wishlist.create({ userId, items: [] });
    }

    if (wishlist.items.length > 0) {
      const productIds = wishlist.items.map(item => item.productId);
      const response = await axios.post(`${inventoryServiceUrl}/api/products/batch`, {
        productIds
      });

      const products = response.data.data || [];

      wishlist.items = wishlist.items.map(item => {
        const product = products.find(p => p._id.toString() === item.productId.toString());
        if (product) {
          return {
            ...item.toObject(),
            productDetails: product
          };
        }
        return item;
      });
    }

    res.json({
      success: true,
      data: wishlist
    });
  } catch (error) {
    logger.error('Error in getWishlist:', error);
    next(error);
  }
};

exports.addToWishlist = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { productId, notifyOnPriceChange = false, notifyOnBackInStock = false } = req.body;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: 'Product ID is required'
      });
    }

    const response = await axios.get(`${inventoryServiceUrl}/api/products/${productId}`);
    const product = response.data.data;

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    let wishlist = await Wishlist.findOne({ userId });

    if (!wishlist) {
      wishlist = await Wishlist.create({ userId, items: [] });
    }

    if (wishlist.hasProduct(productId)) {
      return res.status(400).json({
        success: false,
        message: 'Product already in wishlist'
      });
    }

    await wishlist.addItem({
      productId: product._id,
      productName: product.name,
      productImage: product.images[0]?.url,
      price: product.pricing.salePrice || product.pricing.basePrice,
      companyId: product.companyId,
      notifyOnPriceChange,
      notifyOnBackInStock
    });

    await publishEvent('wishlist.item_added', {
      userId,
      productId: product._id,
      timestamp: new Date()
    });

    res.json({
      success: true,
      message: 'Product added to wishlist',
      data: wishlist
    });
  } catch (error) {
    logger.error('Error in addToWishlist:', error);
    next(error);
  }
};

exports.removeFromWishlist = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { productId } = req.params;

    const wishlist = await Wishlist.findOne({ userId });

    if (!wishlist) {
      return res.status(404).json({
        success: false,
        message: 'Wishlist not found'
      });
    }

    await wishlist.removeItem(productId);

    await publishEvent('wishlist.item_removed', {
      userId,
      productId,
      timestamp: new Date()
    });

    res.json({
      success: true,
      message: 'Item removed from wishlist',
      data: wishlist
    });
  } catch (error) {
    logger.error('Error in removeFromWishlist:', error);
    next(error);
  }
};

exports.moveToCart = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { productId } = req.params;

    const wishlist = await Wishlist.findOne({ userId });

    if (!wishlist || !wishlist.hasProduct(productId)) {
      return res.status(404).json({
        success: false,
        message: 'Product not found in wishlist'
      });
    }

    await wishlist.removeItem(productId);

    res.json({
      success: true,
      message: 'Item moved to cart. Use cart API to add it.',
      data: { productId }
    });
  } catch (error) {
    logger.error('Error in moveToCart:', error);
    next(error);
  }
};
