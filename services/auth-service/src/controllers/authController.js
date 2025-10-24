const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const User = require('../models/User');
const { publishEvent, ROUTING_KEYS } = require('../../../../shared/config/rabbitmq');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const REFRESH_TOKEN_EXPIRES_IN = 30;

const generateToken = (user) => {
  return jwt.sign(
    {
      userId: user._id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
      shopIds: user.shopIds
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

const generateRefreshToken = () => {
  return crypto.randomBytes(40).toString('hex');
};

exports.register = async (req, res) => {
  try {
    const { email, password, role, firstName, lastName, phone, companyId, shopIds } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    if (role === 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Cannot register as super admin'
      });
    }

    if (['company_admin', 'shop_manager', 'shop_staff'].includes(role) && !companyId) {
      return res.status(400).json({
        success: false,
        message: 'Company ID is required for this role'
      });
    }

    const user = new User({
      email,
      password,
      role: role || 'customer',
      companyId,
      shopIds,
      profile: {
        firstName,
        lastName,
        phone
      }
    });

    await user.save();

    await publishEvent(ROUTING_KEYS.USER_REGISTERED, {
      userId: user._id,
      email: user.email,
      role: user.role,
      companyId: user.companyId
    });

    const token = generateToken(user);
    const refreshToken = generateRefreshToken();

    user.refreshTokens.push({
      token: refreshToken,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRES_IN * 24 * 60 * 60 * 1000)
    });
    await user.save();

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user,
        token,
        refreshToken
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: error.message
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    if (user.twoFactorEnabled) {
      return res.json({
        success: true,
        requires2FA: true,
        message: '2FA verification required',
        data: {
          userId: user._id,
          email: user.email
        }
      });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user);
    const refreshToken = generateRefreshToken();

    user.refreshTokens = user.refreshTokens.filter(
      rt => rt.expiresAt > new Date()
    );
    user.refreshTokens.push({
      token: refreshToken,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRES_IN * 24 * 60 * 60 * 1000)
    });
    await user.save();

    await publishEvent(ROUTING_KEYS.USER_LOGGED_IN, {
      userId: user._id,
      email: user.email,
      role: user.role
    });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user,
        token,
        refreshToken
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message
    });
  }
};

exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    const user = await User.findOne({
      'refreshTokens.token': refreshToken,
      'refreshTokens.expiresAt': { $gt: new Date() }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token'
      });
    }

    const token = generateToken(user);
    const newRefreshToken = generateRefreshToken();

    user.refreshTokens = user.refreshTokens.filter(
      rt => rt.token !== refreshToken && rt.expiresAt > new Date()
    );
    user.refreshTokens.push({
      token: newRefreshToken,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRES_IN * 24 * 60 * 60 * 1000)
    });
    await user.save();

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        token,
        refreshToken: newRefreshToken
      }
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({
      success: false,
      message: 'Token refresh failed',
      error: error.message
    });
  }
};

exports.logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const user = await User.findById(req.user.userId);

    if (user && refreshToken) {
      user.refreshTokens = user.refreshTokens.filter(
        rt => rt.token !== refreshToken
      );
      await user.save();
    }

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Logout failed',
      error: error.message
    });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .populate('companyId', 'name logo')
      .populate('shopIds', 'name location');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile',
      error: error.message
    });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, phone, address } = req.body;

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (firstName) user.profile.firstName = firstName;
    if (lastName) user.profile.lastName = lastName;
    if (phone) user.profile.phone = phone;
    if (address) user.profile.address = address;

    await user.save();

    await publishEvent(ROUTING_KEYS.USER_UPDATED, {
      userId: user._id,
      email: user.email,
      profile: user.profile
    });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: user
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: error.message
    });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    user.password = newPassword;
    user.refreshTokens = [];
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change password',
      error: error.message
    });
  }
};

exports.verifyToken = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    res.json({
      success: true,
      data: {
        userId: user._id,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
        shopIds: user.shopIds
      }
    });
  } catch (error) {
    console.error('Verify token error:', error);
    res.status(500).json({
      success: false,
      message: 'Token verification failed',
      error: error.message
    });
  }
};

exports.sendVerificationEmail = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email already verified'
      });
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    user.emailVerificationToken = verificationToken;
    user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save();

    await publishEvent(ROUTING_KEYS.EMAIL_VERIFICATION_REQUESTED, {
      userId: user._id,
      email: user.email,
      token: verificationToken,
      name: `${user.profile.firstName} ${user.profile.lastName}`
    });

    res.json({
      success: true,
      message: 'Verification email sent successfully'
    });
  } catch (error) {
    console.error('Send verification email error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send verification email',
      error: error.message
    });
  }
};

exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification token'
      });
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    await publishEvent(ROUTING_KEYS.EMAIL_VERIFIED, {
      userId: user._id,
      email: user.email
    });

    res.json({
      success: true,
      message: 'Email verified successfully'
    });
  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({
      success: false,
      message: 'Email verification failed',
      error: error.message
    });
  }
};

exports.sendPhoneVerification = async (req, res) => {
  try {
    const { phone } = req.body;
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    user.phoneVerificationCode = verificationCode;
    user.phoneVerificationExpires = new Date(Date.now() + 10 * 60 * 1000);
    user.pendingPhone = phone;
    await user.save();

    await publishEvent(ROUTING_KEYS.PHONE_VERIFICATION_REQUESTED, {
      userId: user._id,
      phone,
      code: verificationCode
    });

    res.json({
      success: true,
      message: 'Verification code sent to phone'
    });
  } catch (error) {
    console.error('Send phone verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send verification code',
      error: error.message
    });
  }
};

exports.verifyPhone = async (req, res) => {
  try {
    const { code } = req.body;
    const user = await User.findOne({
      _id: req.user.userId,
      phoneVerificationCode: code,
      phoneVerificationExpires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification code'
      });
    }

    user.profile.phone = user.pendingPhone;
    user.isPhoneVerified = true;
    user.phoneVerificationCode = undefined;
    user.phoneVerificationExpires = undefined;
    user.pendingPhone = undefined;
    await user.save();

    await publishEvent(ROUTING_KEYS.PHONE_VERIFIED, {
      userId: user._id,
      phone: user.profile.phone
    });

    res.json({
      success: true,
      message: 'Phone verified successfully'
    });
  } catch (error) {
    console.error('Verify phone error:', error);
    res.status(500).json({
      success: false,
      message: 'Phone verification failed',
      error: error.message
    });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.json({
        success: true,
        message: 'If email exists, password reset link has been sent'
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = resetToken;
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();

    await publishEvent(ROUTING_KEYS.PASSWORD_RESET_REQUESTED, {
      userId: user._id,
      email: user.email,
      token: resetToken,
      name: `${user.profile.firstName} ${user.profile.lastName}`
    });

    res.json({
      success: true,
      message: 'If email exists, password reset link has been sent'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Password reset request failed',
      error: error.message
    });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;

    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.refreshTokens = [];
    await user.save();

    await publishEvent(ROUTING_KEYS.PASSWORD_RESET_COMPLETED, {
      userId: user._id,
      email: user.email
    });

    res.json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Password reset failed',
      error: error.message
    });
  }
};

exports.enable2FA = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.twoFactorEnabled) {
      return res.status(400).json({
        success: false,
        message: '2FA already enabled'
      });
    }

    const secret = speakeasy.generateSecret({
      name: `E-Commerce Platform (${user.email})`,
      length: 32
    });

    user.twoFactorSecret = secret.base32;
    await user.save();

    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    res.json({
      success: true,
      message: '2FA secret generated. Please verify to enable.',
      data: {
        secret: secret.base32,
        qrCode: qrCodeUrl
      }
    });
  } catch (error) {
    console.error('Enable 2FA error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to enable 2FA',
      error: error.message
    });
  }
};

exports.verify2FA = async (req, res) => {
  try {
    const { token } = req.body;
    const user = await User.findById(req.user.userId);

    if (!user || !user.twoFactorSecret) {
      return res.status(400).json({
        success: false,
        message: '2FA not set up'
      });
    }

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
      window: 2
    });

    if (!verified) {
      return res.status(400).json({
        success: false,
        message: 'Invalid 2FA token'
      });
    }

    user.twoFactorEnabled = true;
    await user.save();

    await publishEvent(ROUTING_KEYS.TWO_FACTOR_ENABLED, {
      userId: user._id,
      email: user.email
    });

    res.json({
      success: true,
      message: '2FA enabled successfully'
    });
  } catch (error) {
    console.error('Verify 2FA error:', error);
    res.status(500).json({
      success: false,
      message: '2FA verification failed',
      error: error.message
    });
  }
};

exports.disable2FA = async (req, res) => {
  try {
    const { token, password } = req.body;
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid password'
      });
    }

    if (user.twoFactorEnabled) {
      const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token,
        window: 2
      });

      if (!verified) {
        return res.status(400).json({
          success: false,
          message: 'Invalid 2FA token'
        });
      }
    }

    user.twoFactorEnabled = false;
    user.twoFactorSecret = undefined;
    await user.save();

    await publishEvent(ROUTING_KEYS.TWO_FACTOR_DISABLED, {
      userId: user._id,
      email: user.email
    });

    res.json({
      success: true,
      message: '2FA disabled successfully'
    });
  } catch (error) {
    console.error('Disable 2FA error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to disable 2FA',
      error: error.message
    });
  }
};

exports.validate2FA = async (req, res) => {
  try {
    const { email, password, token } = req.body;

    const user = await User.findOne({ email });
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    if (!user.twoFactorEnabled) {
      return res.status(400).json({
        success: false,
        message: '2FA not enabled'
      });
    }

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
      window: 2
    });

    if (!verified) {
      return res.status(400).json({
        success: false,
        message: 'Invalid 2FA token'
      });
    }

    user.lastLogin = new Date();
    await user.save();

    const jwtToken = generateToken(user);
    const refreshToken = generateRefreshToken();

    user.refreshTokens = user.refreshTokens.filter(
      rt => rt.expiresAt > new Date()
    );
    user.refreshTokens.push({
      token: refreshToken,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRES_IN * 24 * 60 * 60 * 1000)
    });
    await user.save();

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user,
        token: jwtToken,
        refreshToken
      }
    });
  } catch (error) {
    console.error('Validate 2FA error:', error);
    res.status(500).json({
      success: false,
      message: '2FA validation failed',
      error: error.message
    });
  }
};
