const ShopReview = require('../models/ShopReview');
const Shop = require('../models/Shop');
const { publishEvent } = require('../config/rabbitmq');
const logger = require('../utils/logger');

exports.createReview = async (req, res, next) => {
  try {
    const reviewData = {
      ...req.body,
      userId: req.user.userId,
    };

    const review = await ShopReview.create(reviewData);

    await updateShopRating(review.shopId);

    await publishEvent('shop.review_created', {
      shopId: review.shopId,
      reviewId: review._id,
      rating: review.rating,
      timestamp: new Date(),
    });

    logger.info(`Review created: ${review._id}`);
    res.status(201).json({ success: true, data: review });
  } catch (error) {
    logger.error(`Create review error: ${error.message}`);
    next(error);
  }
};

exports.getReviews = async (req, res, next) => {
  try {
    const { shopId, userId, status, minRating, page = 1, limit = 20 } = req.query;

    const query = {};
    if (shopId) query.shopId = shopId;
    if (userId) query.userId = userId;
    if (status) query.status = status;
    if (minRating) query.rating = { $gte: parseInt(minRating) };

    const reviews = await ShopReview.find(query)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const count = await ShopReview.countDocuments(query);

    res.json({
      success: true,
      data: reviews,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      total: count,
    });
  } catch (error) {
    logger.error(`Get reviews error: ${error.message}`);
    next(error);
  }
};

exports.getReviewById = async (req, res, next) => {
  try {
    const review = await ShopReview.findById(req.params.id);

    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    res.json({ success: true, data: review });
  } catch (error) {
    logger.error(`Get review error: ${error.message}`);
    next(error);
  }
};

exports.updateReview = async (req, res, next) => {
  try {
    const review = await ShopReview.findById(req.params.id);

    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    if (review.userId.toString() !== req.user.userId) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const updatedReview = await ShopReview.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    await updateShopRating(review.shopId);

    res.json({ success: true, data: updatedReview });
  } catch (error) {
    logger.error(`Update review error: ${error.message}`);
    next(error);
  }
};

exports.deleteReview = async (req, res, next) => {
  try {
    const review = await ShopReview.findById(req.params.id);

    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    if (review.userId.toString() !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    await ShopReview.findByIdAndDelete(req.params.id);
    await updateShopRating(review.shopId);

    logger.info(`Review deleted: ${review._id}`);
    res.json({ success: true, message: 'Review deleted successfully' });
  } catch (error) {
    logger.error(`Delete review error: ${error.message}`);
    next(error);
  }
};

exports.respondToReview = async (req, res, next) => {
  try {
    const { comment } = req.body;

    const review = await ShopReview.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          response: {
            comment,
            respondedAt: new Date(),
            respondedBy: req.user.userId,
          },
        },
      },
      { new: true }
    );

    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    await publishEvent('shop.review_responded', {
      shopId: review.shopId,
      reviewId: review._id,
      timestamp: new Date(),
    });

    res.json({ success: true, data: review });
  } catch (error) {
    logger.error(`Respond to review error: ${error.message}`);
    next(error);
  }
};

exports.markHelpful = async (req, res, next) => {
  try {
    const { helpful } = req.body;

    const update = helpful ? { $inc: { helpful: 1 } } : { $inc: { notHelpful: 1 } };

    const review = await ShopReview.findByIdAndUpdate(req.params.id, update, { new: true });

    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    res.json({ success: true, data: review });
  } catch (error) {
    logger.error(`Mark helpful error: ${error.message}`);
    next(error);
  }
};

async function updateShopRating(shopId) {
  const reviews = await ShopReview.find({ shopId, status: 'approved' });

  if (reviews.length === 0) {
    await Shop.findByIdAndUpdate(shopId, {
      'metrics.averageRating': 0,
      'metrics.totalReviews': 0,
    });
    return;
  }

  const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
  const averageRating = totalRating / reviews.length;

  await Shop.findByIdAndUpdate(shopId, {
    'metrics.averageRating': averageRating,
    'metrics.totalReviews': reviews.length,
  });
}
