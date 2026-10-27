const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { requireAuth, restrictTo } = require('../middleware/auth');
const { validateBody } = require('../middleware/validation');

// Định nghĩa các route cho xác thực người dùng
router.post('/register', validateBody(['fullName', 'password']), authController.register);
router.post('/login', authController.login);

// Làm mới access token bằng refresh token
router.post('/refresh-token', validateBody(['refreshToken']), authController.refreshToken);

// Đăng xuất (yêu cầu đã đăng nhập)
router.post('/logout', requireAuth, authController.logout);

// Các API yêu cầu Token đăng nhập
router.get('/me', requireAuth, authController.getProfile);
router.get('/profile', requireAuth, authController.getProfile);

// Các API quản trị dành cho Admin
router.get('/users', requireAuth, restrictTo('ADMIN'), authController.getAllUsers);
router.patch('/users/:id/role', requireAuth, restrictTo('ADMIN'), validateBody(['role']), authController.updateUserRole);

module.exports = router;
