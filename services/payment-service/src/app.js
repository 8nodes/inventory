const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const paymentRoutes = require('./routes/paymentRoutes');
const walletRoutes = require('./routes/walletRoutes');
const errorHandler = require('./middleware/error');

const app = express();

app.use(helmet());
app.use(cors());

app.use('/api/payments/webhooks/stripe', express.raw({ type: 'application/json' }));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'payment-service' });
});

app.use('/api/payments', paymentRoutes);
app.use('/api/wallets', walletRoutes);

app.use(errorHandler);

module.exports = app;
