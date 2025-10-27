const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const analyticsRoutes = require('./routes/analyticsRoutes');
const reportRoutes = require('./routes/reportRoutes');
const errorHandler = require('./middleware/error');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/analytics', analyticsRoutes);
app.use('/api/reports', reportRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'analytics-service' });
});

app.use(errorHandler);

module.exports = app;
