const mongoose = require('mongoose');

const shopProductSchema = new mongoose.Schema({
  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Shop',
    index: true,
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true,
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ShopCategory',
  },
  customPrice: {
    type: Number,
  },
  customDiscount: {
    type: Number,
    min: 0,
    max: 100,
  },
  stock: {
    type: Number,
    default: 0,
  },
  lowStockThreshold: {
    type: Number,
    default: 10,
  },
  featured: {
    type: Boolean,
    default: false,
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'out_of_stock', 'discontinued'],
    default: 'active',
  },
  visibility: {
    type: String,
    enum: ['public', 'private', 'hidden'],
    default: 'public',
  },
  order: {
    type: Number,
    default: 0,
  },
  metrics: {
    views: {
      type: Number,
      default: 0,
    },
    sales: {
      type: Number,
      default: 0,
    },
    revenue: {
      type: Number,
      default: 0,
    },
  },
}, {
  timestamps: true,
});

shopProductSchema.index({ shopId: 1, productId: 1 }, { unique: true });
shopProductSchema.index({ shopId: 1, status: 1 });
shopProductSchema.index({ shopId: 1, featured: 1 });

module.exports = mongoose.model('ShopProduct', shopProductSchema);
