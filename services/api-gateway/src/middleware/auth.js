const jwt = require('jsonwebtoken');
const axios = require('axios');
const SERVICES = require('../config/services');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      next();
    } catch (jwtError) {
      try {
        const response = await axios.get(`${SERVICES.AUTH.url}/auth/verify`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (response.data.success) {
          req.user = response.data.data;
          next();
        } else {
          return res.status(401).json({
            success: false,
            message: 'Invalid token'
          });
        }
      } catch (apiError) {
        return res.status(401).json({
          success: false,
          message: 'Invalid or expired token'
        });
      }
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Authentication error'
    });
  }
};

const optionalAuth = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
    } catch (error) {
    }
  }

  next();
};

module.exports = {
  authMiddleware,
  optionalAuth
};
