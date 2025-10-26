const express = require('express');
const router = express.Router();
const returnController = require('../controllers/returnController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.post('/', returnController.createReturn);
router.get('/', returnController.getReturns);
router.get('/:id', returnController.getReturnById);
router.post('/:id/approve', returnController.approveReturn);
router.post('/:id/reject', returnController.rejectReturn);
router.patch('/:id/status', returnController.updateReturnStatus);

module.exports = router;
