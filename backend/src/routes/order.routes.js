const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order.controller');
const { requireAuth, restrictTo } = require('../middleware/auth');
const { validateBody } = require('../middleware/validation');

// Tuyến đường công khai cho cổng thanh toán tự động SePay Webhook
router.post('/sepay-webhook', orderController.handleSePayWebhook);
router.post('/webhook/sepay', orderController.handleSePayWebhook);

// Đăng ký quyền xác thực cho các tuyến đường đơn hàng
router.use(requireAuth);

router.post('/', validateBody(['items', 'paymentMethod', 'deliveryAddress', 'shippingFee']), orderController.createOrder);
router.post('/async', validateBody(['items', 'paymentMethod', 'deliveryAddress', 'shippingFee']), orderController.createOrderAsync);
router.get('/', orderController.getOrders);
router.get('/my-orders', orderController.getOrders);

// Admin & Shipper Routes
router.get('/admin', restrictTo('ADMIN'), orderController.getAdminOrders);
router.get('/admin/analytics/revenue', restrictTo('ADMIN'), orderController.getRevenueAnalytics);
router.get('/shipper/available', restrictTo('SHIPPER'), orderController.getShipperAvailableOrders);
router.get('/shipper/active', restrictTo('SHIPPER'), orderController.getShipperActiveOrders);

// Cập nhật trạng thái và nhận đơn giao hàng
router.patch('/:id/status', orderController.updateOrderStatus);
router.patch('/:id/claim', restrictTo('SHIPPER'), orderController.shipperClaimOrder);

// Quản lý mã giảm giá Coupons & Đánh giá Reviews của Admin
router.get('/coupons/admin', restrictTo('ADMIN'), orderController.getAdminCoupons);
router.post('/coupons/admin', restrictTo('ADMIN'), validateBody(['code', 'type', 'value']), orderController.createCoupon);
router.delete('/coupons/admin/:id', restrictTo('ADMIN'), orderController.deleteCoupon);
router.get('/reviews/admin', restrictTo('ADMIN'), orderController.getAdminReviews);

// Tìm kiếm voucher hợp lệ (Khách hàng dùng khi checkout)
router.get('/coupon/:code', orderController.checkCoupon);

// Viết bài đánh giá món ăn sau khi mua thành công
router.post('/:id/reviews', validateBody(['productId', 'rating']), orderController.createReview);

// Xem chi tiết một đơn hàng cụ thể
router.get('/:id', orderController.getOrderById);

module.exports = router;
