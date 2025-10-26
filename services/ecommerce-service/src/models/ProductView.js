const mongoose = require('mongoose');

const productViewSchema = new mongoose.Schema({
  userId: {
    type: String,
    index: true
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  companyId: {
    type: String,
    required: true,
    index: true
  },
  sessionId: String,
  viewedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  duration: {
    type: Number,
    default: 0
  },
  source: {
    type: String,
    enum: ['search', 'category', 'recommendation', 'direct', 'other'],
    default: 'other'
  },
  deviceType: {
    type: String,
    enum: ['mobile', 'tablet', 'desktop', 'other'],
    default: 'other'
  },
  metadata: {
    referrer: String,
    userAgent: String
  }
}, {
  timestamps: true
});

productViewSchema.index({ productId: 1, viewedAt: -1 });
productViewSchema.index({ userId: 1, viewedAt: -1 });
productViewSchema.index({ companyId: 1, viewedAt: -1 });

productViewSchema.statics.recordView = async function(viewData) {
  return await this.create(viewData);
};

productViewSchema.statics.getProductViewCount = async function(productId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return await this.countDocuments({
    productId,
    viewedAt: { $gte: startDate }
  });
};

productViewSchema.statics.getTrendingProducts = async function(companyId, limit = 20, days = 7) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return await this.aggregate([
    {
      $match: {
        companyId,
        viewedAt: { $gte: startDate }
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
        viewCount: 1,
        uniqueUserCount: { $size: '$uniqueUsers' }
      }
    },
    {
      $sort: { viewCount: -1 }
    },
    {
      $limit: limit
    }
  ]);
};

module.exports = mongoose.model('ProductView', productViewSchema);
