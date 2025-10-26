const axios = require('axios').default;
const logger = require('../utils/logger');

class SearchService {
  constructor() {
    this.inventoryServiceUrl = process.env.INVENTORY_SERVICE_URL || 'http://inventory-service:8007';
  }

  async searchProducts(companyId, searchParams) {
    try {
      const {
        query = '',
        category = null,
        subcategory = null,
        minPrice = null,
        maxPrice = null,
        brand = null,
        rating = null,
        inStock = null,
        sortBy = 'relevance',
        page = 1,
        limit = 20,
        tags = []
      } = searchParams;

      const filter = { companyId, status: 'active', visibility: 'public' };

      if (query) {
        filter.$text = { $search: query };
      }

      if (category) {
        filter.category = category;
      }

      if (subcategory) {
        filter.subcategory = subcategory;
      }

      if (minPrice !== null || maxPrice !== null) {
        filter['pricing.basePrice'] = {};
        if (minPrice !== null) filter['pricing.basePrice'].$gte = parseFloat(minPrice);
        if (maxPrice !== null) filter['pricing.basePrice'].$lte = parseFloat(maxPrice);
      }

      if (brand) {
        filter.brand = new RegExp(brand, 'i');
      }

      if (rating) {
        filter['reviewSummary.averageRating'] = { $gte: parseFloat(rating) };
      }

      if (inStock === 'true' || inStock === true) {
        filter['inventory.quantity'] = { $gt: 0 };
      }

      if (tags && tags.length > 0) {
        filter.tags = { $in: Array.isArray(tags) ? tags : [tags] };
      }

      let sort = {};
      switch (sortBy) {
        case 'price_asc':
          sort = { 'pricing.basePrice': 1 };
          break;
        case 'price_desc':
          sort = { 'pricing.basePrice': -1 };
          break;
        case 'rating':
          sort = { 'reviewSummary.averageRating': -1 };
          break;
        case 'newest':
          sort = { createdAt: -1 };
          break;
        case 'popular':
          sort = { 'sales.totalSold': -1 };
          break;
        case 'relevance':
        default:
          sort = query ? { score: { $meta: 'textScore' } } : { featured: -1, sortOrder: 1 };
          break;
      }

      const skip = (page - 1) * limit;

      const response = await axios.get(`${this.inventoryServiceUrl}/api/products`, {
        params: {
          ...searchParams,
          page,
          limit
        }
      });

      return response.data;

    } catch (error) {
      logger.error('Error searching products:', error);
      throw error;
    }
  }

  async getFilterOptions(companyId, category = null) {
    try {
      const response = await axios.get(`${this.inventoryServiceUrl}/api/products/filters`, {
        params: { companyId, category }
      });

      return response.data;
    } catch (error) {
      logger.error('Error getting filter options:', error);
      return {
        brands: [],
        categories: [],
        priceRange: { min: 0, max: 0 },
        tags: []
      };
    }
  }

  async autocomplete(companyId, query, limit = 10) {
    try {
      if (!query || query.length < 2) {
        return [];
      }

      const response = await axios.get(`${this.inventoryServiceUrl}/api/products/autocomplete`, {
        params: { companyId, query, limit }
      });

      return response.data.suggestions || [];
    } catch (error) {
      logger.error('Error in autocomplete:', error);
      return [];
    }
  }
}

module.exports = new SearchService();
