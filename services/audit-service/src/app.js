const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const auditRoutes = require('./routes/auditRoutes');
const securityRoutes = require('./routes/securityRoutes');
const complianceRoutes = require('./routes/complianceRoutes');
const errorHandler = require('./middleware/error');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/audit', auditRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/compliance', complianceRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'audit-service' });
});

app.use(errorHandler);

module.exports = app;
