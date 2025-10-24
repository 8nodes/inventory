const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { authMiddleware } = require('../../../../shared/middleware/authMiddleware');

const router = express.Router();

router.post('/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('role').optional().isIn(['customer', 'company_admin', 'shop_manager', 'shop_staff'])
  ],
  authController.register
);

router.post('/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty()
  ],
  authController.login
);

router.post('/refresh-token',
  [
    body('refreshToken').notEmpty()
  ],
  authController.refreshToken
);

router.post('/logout', authMiddleware, authController.logout);

router.get('/profile', authMiddleware, authController.getProfile);

router.put('/profile', authMiddleware, authController.updateProfile);

router.post('/change-password',
  authMiddleware,
  [
    body('currentPassword').notEmpty(),
    body('newPassword').isLength({ min: 6 })
  ],
  authController.changePassword
);

router.get('/verify', authMiddleware, authController.verifyToken);

module.exports = router;
