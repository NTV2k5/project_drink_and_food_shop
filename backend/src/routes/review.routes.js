const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/review.controller');
const { requireAuth, restrictTo } = require('../middleware/auth');

// Lấy tất cả reviews (Admin)
router.get('/', requireAuth, restrictTo('ADMIN'), reviewController.findAll);

// Tạo review mới (yêu cầu đăng nhập + đã mua hàng)
router.post('/', requireAuth, reviewController.create);

// Xóa review (Admin hoặc chính chủ)
router.delete('/:id', requireAuth, reviewController.remove);

module.exports = router;
