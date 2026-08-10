const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/category.controller');
const { requireAuth, restrictTo } = require('../middleware/auth');
const { validateBody } = require('../middleware/validation');

// Tuyến đường công khai (Public Routes)
router.get('/', categoryController.findAll);
router.get('/slug/:slug', categoryController.findBySlug);
router.get('/:id', categoryController.findOne);

// Tuyến đường quản trị (Admin Only)
router.post('/', requireAuth, restrictTo('ADMIN'), validateBody(['name', 'slug']), categoryController.create);
router.patch('/:id', requireAuth, restrictTo('ADMIN'), categoryController.update);
router.delete('/:id', requireAuth, restrictTo('ADMIN'), categoryController.remove);

module.exports = router;
