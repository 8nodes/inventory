const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const debtRoutes = require('./routes/debtRoutes');
const errorHandler = require('./middleware/error');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'debt-service' });
});

app.use('/api/debts', debtRoutes);

app.use(errorHandler);

module.exports = app;
