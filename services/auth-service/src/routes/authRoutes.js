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

router.post('/send-verification-email', authMiddleware, authController.sendVerificationEmail);

router.get('/verify-email/:token', authController.verifyEmail);

router.post('/send-phone-verification',
  authMiddleware,
  [
    body('phone').notEmpty().isMobilePhone()
  ],
  authController.sendPhoneVerification
);

router.post('/verify-phone',
  authMiddleware,
  [
    body('code').notEmpty().isLength({ min: 6, max: 6 })
  ],
  authController.verifyPhone
);

router.post('/forgot-password',
  [
    body('email').isEmail().normalizeEmail()
  ],
  authController.forgotPassword
);

router.post('/reset-password/:token',
  [
    body('newPassword').isLength({ min: 6 })
  ],
  authController.resetPassword
);

router.post('/2fa/enable', authMiddleware, authController.enable2FA);

router.post('/2fa/verify',
  authMiddleware,
  [
    body('token').notEmpty().isLength({ min: 6, max: 6 })
  ],
  authController.verify2FA
);

router.post('/2fa/disable',
  authMiddleware,
  [
    body('token').notEmpty(),
    body('password').notEmpty()
  ],
  authController.disable2FA
);

router.post('/2fa/validate',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
    body('token').notEmpty().isLength({ min: 6, max: 6 })
  ],
  authController.validate2FA
);

module.exports = router;
