const rateLimit = require('express-rate-limit');

const createRateLimiter = (windowMs = 15 * 60 * 1000, max = 100) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      message: 'Too many requests, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

const authLimiter = createRateLimiter(15 * 60 * 1000, 5);

const apiLimiter = createRateLimiter(15 * 60 * 1000, 100);

const strictLimiter = createRateLimiter(15 * 60 * 1000, 10);

module.exports = {
  createRateLimiter,
  authLimiter,
  apiLimiter,
  strictLimiter
};
