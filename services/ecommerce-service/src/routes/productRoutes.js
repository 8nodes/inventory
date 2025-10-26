const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { authenticate, optionalAuth } = require('../middleware/auth');

router.get('/search', optionalAuth, productController.searchProducts);
router.get('/recommendations', optionalAuth, productController.getRecommendations);
router.get('/recently-viewed', authenticate, productController.getRecentlyViewed);
router.get('/filters', optionalAuth, productController.getFilterOptions);
router.get('/autocomplete', optionalAuth, productController.autocomplete);
router.get('/:id', optionalAuth, productController.getProductDetails);

module.exports = router;
