const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  userId: {
    type: String,
    required: true,
    index: true
  },
  userName: {
    type: String,
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  comment: {
    type: String,
    required: true,
    maxlength: 2000
  },
  images: [String],
  verified: {
    type: Boolean,
    default: false
  },
  helpful: {
    type: Number,
    default: 0
  },
  notHelpful: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  companyResponse: {
    text: String,
    respondedAt: Date,
    respondedBy: String
  }
}, {
  timestamps: true
});

reviewSchema.index({ productId: 1, rating: -1 });
reviewSchema.index({ userId: 1, createdAt: -1 });
reviewSchema.index({ status: 1, createdAt: -1 });

reviewSchema.statics.getProductReviews = async function(productId, options = {}) {
  const { page = 1, limit = 10, rating = null, sort = '-createdAt' } = options;

  const query = { productId, status: 'approved' };
  if (rating) {
    query.rating = rating;
  }

  const skip = (page - 1) * limit;

  const reviews = await this.find(query)
    .sort(sort)
    .skip(skip)
    .limit(limit);

  const total = await this.countDocuments(query);

  return {
    reviews,
    pagination: {
      total,
      page,
      pages: Math.ceil(total / limit)
    }
  };
};

reviewSchema.statics.getReviewSummary = async function(productId) {
  const summary = await this.aggregate([
    {
      $match: { productId: new mongoose.Types.ObjectId(productId), status: 'approved' }
    },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 },
        rating1: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } },
        rating2: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
        rating3: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
        rating4: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
        rating5: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } }
      }
    }
  ]);

  if (summary.length === 0) {
    return {
      averageRating: 0,
      totalReviews: 0,
      ratingsDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    };
  }

  return {
    averageRating: Math.round(summary[0].averageRating * 10) / 10,
    totalReviews: summary[0].totalReviews,
    ratingsDistribution: {
      1: summary[0].rating1,
      2: summary[0].rating2,
      3: summary[0].rating3,
      4: summary[0].rating4,
      5: summary[0].rating5
    }
  };
};

module.exports = mongoose.model('Review', reviewSchema);
