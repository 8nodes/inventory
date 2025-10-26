const mongoose = require('mongoose');

const wishlistItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  productName: String,
  productImage: String,
  price: Number,
  companyId: String,
  addedAt: {
    type: Date,
    default: Date.now
  },
  notifyOnPriceChange: {
    type: Boolean,
    default: false
  },
  notifyOnBackInStock: {
    type: Boolean,
    default: false
  }
});

const wishlistSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  items: [wishlistItemSchema],
  itemCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

wishlistSchema.pre('save', function(next) {
  this.itemCount = this.items.length;
  next();
});

wishlistSchema.methods.addItem = function(item) {
  const existingItem = this.items.find(
    i => i.productId.toString() === item.productId.toString()
  );

  if (!existingItem) {
    this.items.push(item);
  }

  return this.save();
};

wishlistSchema.methods.removeItem = function(productId) {
  this.items = this.items.filter(i => i.productId.toString() !== productId.toString());
  return this.save();
};

wishlistSchema.methods.hasProduct = function(productId) {
  return this.items.some(i => i.productId.toString() === productId.toString());
};

wishlistSchema.index({ userId: 1 });
wishlistSchema.index({ 'items.productId': 1 });

module.exports = mongoose.model('Wishlist', wishlistSchema);
