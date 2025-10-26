const axios = require('axios').default;
const searchService = require('../services/searchService');
const recommendationService = require('../services/recommendationService');
const ProductView = require('../models/ProductView');
const Review = require('../models/Review');
const { publishEvent } = require('../config/rabbitmq');
const logger = require('../utils/logger');

const inventoryServiceUrl = process.env.INVENTORY_SERVICE_URL || 'http://inventory-service:8007';

exports.searchProducts = async (req, res, next) => {
  try {
    const companyId = req.user?.companyId || req.query.companyId;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'Company ID is required'
      });
    }

    const results = await searchService.searchProducts(companyId, req.query);

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    logger.error('Error in searchProducts:', error);
    next(error);
  }
};

exports.getProductDetails = async (req, res, next) => {
  try {
    const { id } = req.params;

    const response = await axios.get(`${inventoryServiceUrl}/api/products/${id}`);
    const product = response.data.data;

    if (req.user?.userId) {
      await ProductView.recordView({
        userId: req.user.userId,
        productId: id,
        companyId: product.companyId,
        source: req.query.source || 'direct',
        metadata: {
          userAgent: req.headers['user-agent']
        }
      });

      await publishEvent('product.viewed', {
        userId: req.user.userId,
        productId: id,
        companyId: product.companyId,
        timestamp: new Date()
      });
    }

    const reviewSummary = await Review.getReviewSummary(id);

    res.json({
      success: true,
      data: {
        ...product,
        reviewSummary
      }
    });
  } catch (error) {
    logger.error('Error in getProductDetails:', error);
    next(error);
  }
};

exports.getRecommendations = async (req, res, next) => {
  try {
    const { type = 'personalized', productId, limit = 10 } = req.query;
    const userId = req.user?.userId;
    const companyId = req.user?.companyId || req.query.companyId;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'Company ID is required'
      });
    }

    let productIds = [];

    switch (type) {
      case 'personalized':
        if (userId) {
          productIds = await recommendationService.getPersonalizedRecommendations(userId, companyId, limit);
        } else {
          productIds = await recommendationService.getTrendingProducts(companyId, limit);
        }
        break;

      case 'trending':
        productIds = await recommendationService.getTrendingProducts(companyId, limit);
        break;

      case 'similar':
        if (!productId) {
          return res.status(400).json({
            success: false,
            message: 'Product ID is required for similar recommendations'
          });
        }
        productIds = await recommendationService.getContentBasedRecommendations(productId, companyId, limit);
        break;

      case 'frequently_bought':
        if (!productId) {
          return res.status(400).json({
            success: false,
            message: 'Product ID is required for frequently bought together'
          });
        }
        productIds = await recommendationService.getFrequentlyBoughtTogether(productId, companyId, limit);
        break;

      case 'new_arrivals':
        productIds = await recommendationService.getNewArrivals(companyId, limit);
        break;

      case 'best_sellers':
        productIds = await recommendationService.getBestSellers(companyId, limit);
        break;

      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid recommendation type'
        });
    }

    if (productIds.length === 0) {
      return res.json({
        success: true,
        data: {
          products: [],
          total: 0
        }
      });
    }

    const response = await axios.post(`${inventoryServiceUrl}/api/products/batch`, {
      productIds
    });

    res.json({
      success: true,
      data: {
        products: response.data.data || [],
        total: response.data.data?.length || 0,
        type
      }
    });
  } catch (error) {
    logger.error('Error in getRecommendations:', error);
    next(error);
  }
};

exports.getRecentlyViewed = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const limit = parseInt(req.query.limit) || 10;

    const recentViews = await recommendationService.getRecentlyViewed(userId, limit);
    const productIds = recentViews.map(v => v.productId);

    if (productIds.length === 0) {
      return res.json({
        success: true,
        data: {
          products: [],
          total: 0
        }
      });
    }

    const response = await axios.post(`${inventoryServiceUrl}/api/products/batch`, {
      productIds
    });

    res.json({
      success: true,
      data: {
        products: response.data.data || [],
        total: response.data.data?.length || 0
      }
    });
  } catch (error) {
    logger.error('Error in getRecentlyViewed:', error);
    next(error);
  }
};

exports.getFilterOptions = async (req, res, next) => {
  try {
    const companyId = req.user?.companyId || req.query.companyId;
    const category = req.query.category;

    const filters = await searchService.getFilterOptions(companyId, category);

    res.json({
      success: true,
      data: filters
    });
  } catch (error) {
    logger.error('Error in getFilterOptions:', error);
    next(error);
  }
};

exports.autocomplete = async (req, res, next) => {
  try {
    const { query } = req.query;
    const companyId = req.user?.companyId || req.query.companyId;
    const limit = parseInt(req.query.limit) || 10;

    const suggestions = await searchService.autocomplete(companyId, query, limit);

    res.json({
      success: true,
      data: {
        suggestions
      }
    });
  } catch (error) {
    logger.error('Error in autocomplete:', error);
    next(error);
  }
};
