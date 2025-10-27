const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');
const SERVICES = require('./config/services');
const { authMiddleware, optionalAuth } = require('./middleware/auth');
const { authLimiter, apiLimiter } = require('./middleware/rateLimiter');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    service: 'api-gateway',
    timestamp: new Date().toISOString()
  });
});

app.use('/api/auth', authLimiter, createProxyMiddleware({
  target: SERVICES.AUTH.url,
  changeOrigin: true,
  pathRewrite: {
    '^/api/auth': '/auth'
  }
}));

app.use('/api/companies', authMiddleware, apiLimiter, createProxyMiddleware({
  target: SERVICES.COMPANY.url,
  changeOrigin: true,
  pathRewrite: {
    '^/api/companies': '/companies'
  }
}));

app.use('/api/chat', authMiddleware, apiLimiter, createProxyMiddleware({
  target: SERVICES.CHAT.url,
  changeOrigin: true,
  pathRewrite: {
    '^/api/chat': '/api'
  }
}));

app.use('/api/shops', authMiddleware, apiLimiter, createProxyMiddleware({
  target: SERVICES.SHOP.url,
  changeOrigin: true,
  pathRewrite: {
    '^/api/shops': '/api/shops'
  }
}));

app.use('/api/shop-products', authMiddleware, apiLimiter, createProxyMiddleware({
  target: SERVICES.SHOP.url,
  changeOrigin: true,
  pathRewrite: {
    '^/api/shop-products': '/api/shop-products'
  }
}));

app.use('/api/shop-categories', authMiddleware, apiLimiter, createProxyMiddleware({
  target: SERVICES.SHOP.url,
  changeOrigin: true,
  pathRewrite: {
    '^/api/shop-categories': '/api/categories'
  }
}));

app.use('/api/shop-reviews', authMiddleware, apiLimiter, createProxyMiddleware({
  target: SERVICES.SHOP.url,
  changeOrigin: true,
  pathRewrite: {
    '^/api/shop-reviews': '/api/reviews'
  }
}));

app.use('/api/products', optionalAuth, apiLimiter, createProxyMiddleware({
  target: SERVICES.ECOMMERCE.url,
  changeOrigin: true,
  pathRewrite: {
    '^/api/products': '/products'
  }
}));

app.use('/api/cart', authMiddleware, apiLimiter, createProxyMiddleware({
  target: SERVICES.ECOMMERCE.url,
  changeOrigin: true,
  pathRewrite: {
    '^/api/cart': '/cart'
  }
}));

app.use('/api/wishlist', authMiddleware, apiLimiter, createProxyMiddleware({
  target: SERVICES.ECOMMERCE.url,
  changeOrigin: true,
  pathRewrite: {
    '^/api/wishlist': '/wishlist'
  }
}));

app.use('/api/recommendations', authMiddleware, apiLimiter, createProxyMiddleware({
  target: SERVICES.ECOMMERCE.url,
  changeOrigin: true,
  pathRewrite: {
    '^/api/recommendations': '/recommendations'
  }
}));

app.use('/api/orders', authMiddleware, apiLimiter, createProxyMiddleware({
  target: SERVICES.SALES.url,
  changeOrigin: true,
  pathRewrite: {
    '^/api/orders': '/orders'
  }
}));

app.use('/api/inventory', authMiddleware, apiLimiter, createProxyMiddleware({
  target: SERVICES.INVENTORY.url,
  changeOrigin: true,
  pathRewrite: {
    '^/api/inventory': '/inventory'
  }
}));

app.use('/api/notifications', authMiddleware, apiLimiter, createProxyMiddleware({
  target: SERVICES.NOTIFICATION.url,
  changeOrigin: true,
  pathRewrite: {
    '^/api/notifications': '/notifications'
  }
}));

app.use('/api/audit', authMiddleware, apiLimiter, createProxyMiddleware({
  target: SERVICES.AUDIT.url,
  changeOrigin: true,
  pathRewrite: {
    '^/api/audit': '/api/audit'
  }
}));

app.use('/api/security', authMiddleware, apiLimiter, createProxyMiddleware({
  target: SERVICES.AUDIT.url,
  changeOrigin: true,
  pathRewrite: {
    '^/api/security': '/api/security'
  }
}));

app.use('/api/compliance', authMiddleware, apiLimiter, createProxyMiddleware({
  target: SERVICES.AUDIT.url,
  changeOrigin: true,
  pathRewrite: {
    '^/api/compliance': '/api/compliance'
  }
}));

app.use('/api/analytics', authMiddleware, apiLimiter, createProxyMiddleware({
  target: SERVICES.ANALYTICS.url,
  changeOrigin: true,
  pathRewrite: {
    '^/api/analytics': '/api/analytics'
  }
}));

app.use('/api/reports', authMiddleware, apiLimiter, createProxyMiddleware({
  target: SERVICES.ANALYTICS.url,
  changeOrigin: true,
  pathRewrite: {
    '^/api/reports': '/api/reports'
  }
}));

app.use('/api/payments', authMiddleware, apiLimiter, createProxyMiddleware({
  target: SERVICES.PAYMENT.url,
  changeOrigin: true,
  pathRewrite: {
    '^/api/payments': '/api/payments'
  }
}));

app.use('/api/wallets', authMiddleware, apiLimiter, createProxyMiddleware({
  target: SERVICES.PAYMENT.url,
  changeOrigin: true,
  pathRewrite: {
    '^/api/wallets': '/api/wallets'
  }
}));

app.use('/api/debts', authMiddleware, apiLimiter, createProxyMiddleware({
  target: SERVICES.DEBT.url,
  changeOrigin: true,
  pathRewrite: {
    '^/api/debts': '/api/debts'
  }
}));

app.use('/api/checkout', authMiddleware, apiLimiter, createProxyMiddleware({
  target: SERVICES.ECOMMERCE.url,
  changeOrigin: true,
  pathRewrite: {
    '^/api/checkout': '/api/checkout'
  }
}));

app.use('/api/subscriptions', authMiddleware, apiLimiter, createProxyMiddleware({
  target: SERVICES.COMPANY.url,
  changeOrigin: true,
  pathRewrite: {
    '^/api/subscriptions': '/api/subscriptions'
  }
}));

app.use((err, req, res, next) => {
  console.error('Gateway error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Gateway error'
  });
});

module.exports = app;
