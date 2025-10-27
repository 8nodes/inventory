const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const errorMiddleware = require('./middleware/error');
const companyRoutes = require('./routes/companyRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/company', companyRoutes);
app.use('/api/subscriptions', subscriptionRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', service: 'company-service', timestamp: new Date().toISOString() });
});

app.use(errorMiddleware);

module.exports = app;
