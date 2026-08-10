const express = require('express');
const router = express.Router();

const authRoutes = require('./auth.routes');
const categoryRoutes = require('./category.routes');
const productRoutes = require('./product.routes');
const orderRoutes = require('./order.routes');
const locationRoutes = require('./location.routes');
const cartRoutes = require('./cart.routes');
const reviewRoutes = require('./review.routes');

// Đăng ký các module định tuyến chuẩn REST API (tương ứng từng module)
router.use('/auth', authRoutes);
router.use('/categories', categoryRoutes);
router.use('/products', productRoutes);
router.use('/orders', orderRoutes);
router.use('/locations', locationRoutes);
router.use('/cart', cartRoutes);
router.use('/reviews', reviewRoutes);

module.exports = router;
