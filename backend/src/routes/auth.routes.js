const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { requireAuth, restrictTo } = require('../middleware/auth');
const { validateBody } = require('../middleware/validation');

// Định nghĩa các tuyến đường cho xác thực người dùng
router.post('/register', validateBody(['fullName', 'password']), authController.register);
router.post('/login', authController.login);

// Các API yêu cầu Token đăng nhập
router.get('/me', requireAuth, authController.getProfile);

// Các API quản trị dành cho Admin
router.get('/users', requireAuth, restrictTo('ADMIN'), authController.getAllUsers);
router.patch('/users/:id/role', requireAuth, restrictTo('ADMIN'), validateBody(['role']), authController.updateUserRole);

module.exports = router;
