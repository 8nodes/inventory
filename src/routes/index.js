const express = require('express');
const productRoutes = require('./productRoutes');
const stockChangeRoutes = require('./stockChangeRoutes');
const inventoryAdjustmentRoutes = require('./inventoryAdjustmentRoutes');
const reportRoutes = require('./reportRoutes');
const discountRoutes = require('./discountRoutes');
const alertRoutes = require('./alertRoutes');
const categoryRoutes = require('./categoryRoutes');
const warehouseRoutes = require('./warehouseRoutes');
const reservationRoutes = require('./reservationRoutes');
const batchRoutes = require('./batchRoutes');
const transferRoutes = require('./transferRoutes');
const router = express.Router();

router.get('/', (req, res) => {
    res.json({
        message: "Inventory Service API",
        version: "2.0",
        status: "operational",
        endpoints: {
            products: "/v1/products",
            stockChanges: "/v1/stock-changes",
            discounts: "/v1/discounts",
            alerts: "/v1/alerts",
            categories: "/v1/categories",
            warehouses: "/v1/warehouses",
            reservations: "/v1/reservations",
            transfers: "/v1/transfers",
            batch: "/v1/batch",
            reports: "/v1/report",
            inventoryAdjustment: "/v1/inventory-adjustment"
        }
    })
})

router.use('/v1/products', productRoutes);
router.use('/v1/stock-changes', stockChangeRoutes);
router.use('/v1/discounts', discountRoutes);
router.use('/v1/alerts', alertRoutes);
router.use('/v1/categories', categoryRoutes);
router.use('/v1/warehouses', warehouseRoutes);
router.use('/v1/reservations', reservationRoutes);
router.use('/v1/transfers', transferRoutes);
router.use('/v1/batch', batchRoutes);
router.use('/v1/report', reportRoutes);
router.use('/v1/inventory-adjustment', inventoryAdjustmentRoutes);

module.exports = router;