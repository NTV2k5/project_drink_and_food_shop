const express = require('express');
const router = express.Router();
const productController = require('../controllers/product.controller');
const { requireAuth, restrictTo } = require('../middleware/auth');
const { validateBody } = require('../middleware/validation');

// Tuyến đường công khai (Public Routes)
router.get('/', productController.findAll);
router.get('/bestsellers', productController.findBestsellers);
router.get('/slug/:slug', productController.findBySlug);
router.get('/:id', productController.findOne);
router.get('/:id/reviews', productController.getProductReviews);

// Tuyến đường quản trị (Admin Only)
router.post('/', requireAuth, restrictTo('ADMIN'), validateBody(['name', 'slug', 'basePrice', 'categoryId']), productController.create);
router.patch('/:id', requireAuth, restrictTo('ADMIN'), productController.update);
router.patch('/:id/availability', requireAuth, restrictTo('ADMIN'), productController.toggleAvailability);
router.delete('/:id', requireAuth, restrictTo('ADMIN'), productController.remove);

module.exports = router;
