const mongoose = require('mongoose');

const shopReviewSchema = new mongoose.Schema({
  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Shop',
    index: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true,
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    index: true,
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
  title: {
    type: String,
    trim: true,
  },
  comment: {
    type: String,
    trim: true,
  },
  images: [{
    type: String,
  }],
  response: {
    comment: String,
    respondedAt: Date,
    respondedBy: mongoose.Schema.Types.ObjectId,
  },
  helpful: {
    type: Number,
    default: 0,
  },
  notHelpful: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  verified: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

shopReviewSchema.index({ shopId: 1, userId: 1 });
shopReviewSchema.index({ shopId: 1, status: 1, rating: 1 });

module.exports = mongoose.model('ShopReview', shopReviewSchema);
