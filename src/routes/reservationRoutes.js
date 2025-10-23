const express = require('express');
const router = express.Router();
const {
  createReservation,
  fulfillReservation,
  cancelReservation,
  getReservationById,
  getAllReservations,
  getAvailableStock,
  cleanupExpiredReservations
} = require('../controllers/reservationController');

router.post('/', createReservation);
router.get('/', getAllReservations);
router.get('/available-stock', getAvailableStock);
router.get('/:id', getReservationById);
router.patch('/:id/fulfill', fulfillReservation);
router.patch('/:id/cancel', cancelReservation);
router.post('/cleanup-expired', cleanupExpiredReservations);

module.exports = router;
