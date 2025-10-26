const Review = require('../models/Review');
const { publishEvent } = require('../config/rabbitmq');
const logger = require('../utils/logger');

exports.getProductReviews = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { page = 1, limit = 10, rating, sort = '-createdAt' } = req.query;

    const result = await Review.getProductReviews(productId, {
      page: parseInt(page),
      limit: parseInt(limit),
      rating: rating ? parseInt(rating) : null,
      sort
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error in getProductReviews:', error);
    next(error);
  }
};

exports.getReviewSummary = async (req, res, next) => {
  try {
    const { productId } = req.params;

    const summary = await Review.getReviewSummary(productId);

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    logger.error('Error in getReviewSummary:', error);
    next(error);
  }
};

exports.createReview = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { productId, rating, title, comment, images = [] } = req.body;

    if (!productId || !rating || !title || !comment) {
      return res.status(400).json({
        success: false,
        message: 'Product ID, rating, title, and comment are required'
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }

    const existingReview = await Review.findOne({ productId, userId, status: { $ne: 'rejected' } });

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this product'
      });
    }

    const review = await Review.create({
      productId,
      userId,
      userName: req.user.email.split('@')[0],
      rating,
      title,
      comment,
      images,
      status: 'pending'
    });

    await publishEvent('review.created', {
      reviewId: review._id,
      productId,
      userId,
      rating,
      timestamp: new Date()
    });

    res.status(201).json({
      success: true,
      message: 'Review submitted successfully and pending approval',
      data: review
    });
  } catch (error) {
    logger.error('Error in createReview:', error);
    next(error);
  }
};

exports.updateReview = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { reviewId } = req.params;
    const { rating, title, comment, images } = req.body;

    const review = await Review.findOne({ _id: reviewId, userId });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    if (review.status === 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Cannot edit approved review'
      });
    }

    if (rating) review.rating = rating;
    if (title) review.title = title;
    if (comment) review.comment = comment;
    if (images) review.images = images;

    review.status = 'pending';
    await review.save();

    res.json({
      success: true,
      message: 'Review updated successfully',
      data: review
    });
  } catch (error) {
    logger.error('Error in updateReview:', error);
    next(error);
  }
};

exports.deleteReview = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { reviewId } = req.params;

    const review = await Review.findOne({ _id: reviewId, userId });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    await review.deleteOne();

    await publishEvent('review.deleted', {
      reviewId: review._id,
      productId: review.productId,
      userId,
      timestamp: new Date()
    });

    res.json({
      success: true,
      message: 'Review deleted successfully'
    });
  } catch (error) {
    logger.error('Error in deleteReview:', error);
    next(error);
  }
};

exports.markHelpful = async (req, res, next) => {
  try {
    const { reviewId } = req.params;
    const { helpful } = req.body;

    const review = await Review.findById(reviewId);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    if (helpful === true) {
      review.helpful += 1;
    } else if (helpful === false) {
      review.notHelpful += 1;
    }

    await review.save();

    res.json({
      success: true,
      message: 'Feedback recorded',
      data: review
    });
  } catch (error) {
    logger.error('Error in markHelpful:', error);
    next(error);
  }
};

exports.getUserReviews = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 10 } = req.query;

    const skip = (page - 1) * limit;

    const reviews = await Review.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Review.countDocuments({ userId });

    res.json({
      success: true,
      data: {
        reviews,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    logger.error('Error in getUserReviews:', error);
    next(error);
  }
};
