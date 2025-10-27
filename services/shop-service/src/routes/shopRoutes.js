const express = require('express');
const router = express.Router();
const shopController = require('../controllers/shopController');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

router.post('/', authMiddleware, shopController.createShop);
router.get('/', shopController.getShops);
router.get('/:id', shopController.getShopById);
router.get('/slug/:slug', shopController.getShopBySlug);
router.put('/:id', authMiddleware, shopController.updateShop);
router.delete('/:id', authMiddleware, roleMiddleware(['admin', 'owner']), shopController.deleteShop);
router.patch('/:id/status', authMiddleware, roleMiddleware(['admin']), shopController.updateShopStatus);
router.get('/:id/stats', authMiddleware, shopController.getShopStats);
router.post('/:id/staff', authMiddleware, roleMiddleware(['owner', 'admin']), shopController.addStaffMember);
router.delete('/:id/staff/:userId', authMiddleware, roleMiddleware(['owner', 'admin']), shopController.removeStaffMember);

module.exports = router;
