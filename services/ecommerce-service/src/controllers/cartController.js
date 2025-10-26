const Cart = require('../models/Cart');
const axios = require('axios').default;
const { publishEvent } = require('../config/rabbitmq');
const logger = require('../utils/logger');

const inventoryServiceUrl = process.env.INVENTORY_SERVICE_URL || 'http://inventory-service:8007';

exports.getCart = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    let cart = await Cart.findOne({ userId });

    if (!cart) {
      cart = await Cart.create({ userId, items: [] });
    }

    res.json({
      success: true,
      data: cart
    });
  } catch (error) {
    logger.error('Error in getCart:', error);
    next(error);
  }
};

exports.addToCart = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { productId, quantity = 1 } = req.body;

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

    if (product.inventory.quantity < quantity) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient stock available'
      });
    }

    let cart = await Cart.findOne({ userId });

    if (!cart) {
      cart = await Cart.create({ userId, items: [] });
    }

    await cart.addItem({
      productId: product._id,
      productName: product.name,
      productImage: product.images[0]?.url,
      sku: product.sku,
      quantity,
      price: product.pricing.salePrice || product.pricing.basePrice,
      companyId: product.companyId
    });

    await publishEvent('cart.item_added', {
      userId,
      productId: product._id,
      quantity,
      timestamp: new Date()
    });

    res.json({
      success: true,
      message: 'Product added to cart',
      data: cart
    });
  } catch (error) {
    logger.error('Error in addToCart:', error);
    next(error);
  }
};

exports.updateCartItem = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { productId } = req.params;
    const { quantity } = req.body;

    if (quantity < 0) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be non-negative'
      });
    }

    const cart = await Cart.findOne({ userId });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    if (quantity > 0) {
      const response = await axios.get(`${inventoryServiceUrl}/api/products/${productId}`);
      const product = response.data.data;

      if (product.inventory.quantity < quantity) {
        return res.status(400).json({
          success: false,
          message: 'Insufficient stock available'
        });
      }
    }

    await cart.updateItemQuantity(productId, quantity);

    await publishEvent('cart.updated', {
      userId,
      productId,
      quantity,
      timestamp: new Date()
    });

    res.json({
      success: true,
      message: quantity === 0 ? 'Item removed from cart' : 'Cart updated',
      data: cart
    });
  } catch (error) {
    logger.error('Error in updateCartItem:', error);
    next(error);
  }
};

exports.removeFromCart = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { productId } = req.params;

    const cart = await Cart.findOne({ userId });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    await cart.removeItem(productId);

    await publishEvent('cart.item_removed', {
      userId,
      productId,
      timestamp: new Date()
    });

    res.json({
      success: true,
      message: 'Item removed from cart',
      data: cart
    });
  } catch (error) {
    logger.error('Error in removeFromCart:', error);
    next(error);
  }
};

exports.clearCart = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const cart = await Cart.findOne({ userId });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    await cart.clear();

    await publishEvent('cart.cleared', {
      userId,
      timestamp: new Date()
    });

    res.json({
      success: true,
      message: 'Cart cleared',
      data: cart
    });
  } catch (error) {
    logger.error('Error in clearCart:', error);
    next(error);
  }
};
