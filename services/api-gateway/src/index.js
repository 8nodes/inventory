require('dotenv').config({ path: '../../../.env' });
const app = require('./app');
const { createLogger } = require('../../../shared/utils/logger');

const PORT = process.env.API_GATEWAY_PORT || 8000;
const logger = createLogger('api-gateway');

app.listen(PORT, () => {
  logger.info(`API Gateway running on http://localhost:${PORT}`);
  logger.info('Gateway is ready to route requests');
});

process.on('SIGINT', () => {
  logger.info('Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Shutting down gracefully...');
  process.exit(0);
});
