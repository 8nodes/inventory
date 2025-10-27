const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const shopRoutes = require('./routes/shopRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const productRoutes = require('./routes/productRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const errorHandler = require('./middleware/error');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/shops', shopRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/shop-products', productRoutes);
app.use('/api/reviews', reviewRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'shop-service' });
});

app.use(errorHandler);

module.exports = app;
