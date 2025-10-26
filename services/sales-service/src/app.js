const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const errorHandler = require('./middleware/error');

const orderRoutes = require('./routes/orderRoutes');
const returnRoutes = require('./routes/returnRoutes');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'sales-service',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

app.use('/api/orders', orderRoutes);
app.use('/api/returns', returnRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

app.use(errorHandler);

module.exports = app;
