const express = require('express');
const router = express.Router();
const {
  batchUpdateInventory,
  batchUpdatePrices,
  batchUpdateStatus,
  batchDeleteProducts,
  batchImportProducts
} = require('../controllers/batchController');

router.post('/inventory', batchUpdateInventory);
router.post('/prices', batchUpdatePrices);
router.post('/status', batchUpdateStatus);
router.post('/delete', batchDeleteProducts);
router.post('/import', batchImportProducts);

module.exports = router;
