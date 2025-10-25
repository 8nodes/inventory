const express = require('express');
const router = express.Router();
const {
  createTransfer,
  approveTransfer,
  completeTransfer,
  cancelTransfer,
  getTransferById,
  getAllTransfers
} = require('../controllers/transferController');

router.post('/', createTransfer);
router.get('/', getAllTransfers);
router.get('/:id', getTransferById);
router.patch('/:id/approve', approveTransfer);
router.patch('/:id/complete', completeTransfer);
router.patch('/:id/cancel', cancelTransfer);

module.exports = router;
