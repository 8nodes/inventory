const ProductView = require('../models/ProductView');
const logger = require('../utils/logger');

class RecommendationService {
  async getPersonalizedRecommendations(userId, companyId, limit = 10) {
    try {
      const recentViews = await ProductView.find({ userId, companyId })
        .sort({ viewedAt: -1 })
        .limit(20)
        .select('productId');

      const viewedProductIds = recentViews.map(v => v.productId);

      if (viewedProductIds.length === 0) {
        return await this.getTrendingProducts(companyId, limit);
      }

      const similarUsers = await this.findSimilarUsers(userId, viewedProductIds, companyId);

      const recommendedProducts = await this.getCollaborativeRecommendations(
        similarUsers,
        viewedProductIds,
        companyId,
        limit
      );

      if (recommendedProducts.length < limit) {
        const trending = await this.getTrendingProducts(companyId, limit - recommendedProducts.length);
        return [...recommendedProducts, ...trending];
      }

      return recommendedProducts;
    } catch (error) {
      logger.error('Error getting personalized recommendations:', error);
      return await this.getTrendingProducts(companyId, limit);
    }
  }

  async findSimilarUsers(userId, viewedProductIds, companyId) {
    try {
      const similarUserViews = await ProductView.aggregate([
        {
          $match: {
            productId: { $in: viewedProductIds },
            userId: { $ne: userId },
            companyId
          }
        },
        {
          $group: {
            _id: '$userId',
            commonViews: { $sum: 1 },
            products: { $addToSet: '$productId' }
          }
        },
        {
          $match: {
            commonViews: { $gte: 2 }
          }
        },
        {
          $sort: { commonViews: -1 }
        },
        {
          $limit: 50
        }
      ]);

      return similarUserViews;
    } catch (error) {
      logger.error('Error finding similar users:', error);
      return [];
    }
  }

  async getCollaborativeRecommendations(similarUsers, excludeProductIds, companyId, limit) {
    try {
      if (similarUsers.length === 0) return [];

      const similarUserIds = similarUsers.map(u => u._id);

      const recommendations = await ProductView.aggregate([
        {
          $match: {
            userId: { $in: similarUserIds },
            productId: { $nin: excludeProductIds },
            companyId
          }
        },
        {
          $group: {
            _id: '$productId',
            viewCount: { $sum: 1 },
            uniqueUsers: { $addToSet: '$userId' }
          }
        },
        {
          $project: {
            productId: '$_id',
            score: {
              $add: [
                { $multiply: ['$viewCount', 1] },
                { $multiply: [{ $size: '$uniqueUsers' }, 2] }
              ]
            }
          }
        },
        {
          $sort: { score: -1 }
        },
        {
          $limit: limit
        }
      ]);

      return recommendations.map(r => r.productId);
    } catch (error) {
      logger.error('Error getting collaborative recommendations:', error);
      return [];
    }
  }

  async getContentBasedRecommendations(productId, companyId, limit = 10) {
    try {
      return [];
    } catch (error) {
      logger.error('Error getting content-based recommendations:', error);
      return [];
    }
  }

  async getTrendingProducts(companyId, limit = 10, days = 7) {
    try {
      const trending = await ProductView.getTrendingProducts(companyId, limit, days);
      return trending.map(t => t.productId);
    } catch (error) {
      logger.error('Error getting trending products:', error);
      return [];
    }
  }

  async getFrequentlyBoughtTogether(productId, companyId, limit = 5) {
    try {
      return [];
    } catch (error) {
      logger.error('Error getting frequently bought together:', error);
      return [];
    }
  }

  async getRecentlyViewed(userId, limit = 10) {
    try {
      const recentViews = await ProductView.find({ userId })
        .sort({ viewedAt: -1 })
        .limit(limit)
        .select('productId viewedAt');

      return recentViews.map(v => ({
        productId: v.productId,
        viewedAt: v.viewedAt
      }));
    } catch (error) {
      logger.error('Error getting recently viewed:', error);
      return [];
    }
  }

  async getNewArrivals(companyId, limit = 10, days = 30) {
    try {
      return [];
    } catch (error) {
      logger.error('Error getting new arrivals:', error);
      return [];
    }
  }

  async getBestSellers(companyId, limit = 10, days = 30) {
    try {
      return [];
    } catch (error) {
      logger.error('Error getting best sellers:', error);
      return [];
    }
  }
}

module.exports = new RecommendationService();
