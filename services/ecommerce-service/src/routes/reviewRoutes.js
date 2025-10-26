const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { authenticate, optionalAuth } = require('../middleware/auth');

router.get('/products/:productId', optionalAuth, reviewController.getProductReviews);
router.get('/products/:productId/summary', optionalAuth, reviewController.getReviewSummary);
router.get('/my-reviews', authenticate, reviewController.getUserReviews);
router.post('/', authenticate, reviewController.createReview);
router.put('/:reviewId', authenticate, reviewController.updateReview);
router.delete('/:reviewId', authenticate, reviewController.deleteReview);
router.post('/:reviewId/helpful', optionalAuth, reviewController.markHelpful);

module.exports = router;
