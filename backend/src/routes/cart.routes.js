const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cart.controller');
const { requireAuth } = require('../middleware/auth');
const { validateBody } = require('../middleware/validation');

// Tất cả các route giỏ hàng đều yêu cầu đăng nhập
router.use(requireAuth);

router.get('/', cartController.getCart);
router.post('/', validateBody(['productId', 'quantity']), cartController.addToCart);
router.patch('/:id', cartController.updateCartItem);
router.delete('/:id', cartController.removeFromCart);
router.delete('/', cartController.clearCart);

module.exports = router;
