const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

const ROLES = {
  SUPER_ADMIN: 'super_admin',
  COMPANY_ADMIN: 'company_admin',
  SHOP_MANAGER: 'shop_manager',
  SHOP_STAFF: 'shop_staff',
  CUSTOMER: 'customer'
};

const authMiddleware = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};

const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    next();
  };
};

const checkCompanyAccess = (req, res, next) => {
  const { companyId } = req.params.companyId || req.body.companyId || req.query.companyId;

  if (req.user.role === ROLES.SUPER_ADMIN) {
    return next();
  }

  if (req.user.companyId !== companyId) {
    return res.status(403).json({
      success: false,
      message: 'Access denied to this company'
    });
  }

  next();
};

const checkShopAccess = (shopId) => {
  return (req, res, next) => {
    const targetShopId = shopId || req.params.shopId || req.body.shopId || req.query.shopId;

    if (req.user.role === ROLES.SUPER_ADMIN || req.user.role === ROLES.COMPANY_ADMIN) {
      return next();
    }

    if (!req.user.shopIds || !req.user.shopIds.includes(targetShopId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this shop'
      });
    }

    next();
  };
};

module.exports = {
  authMiddleware,
  authorize,
  checkCompanyAccess,
  checkShopAccess,
  ROLES
};
