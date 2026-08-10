const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { ApiError } = require('./errorHandler');

// Middleware yêu cầu đăng nhập bằng JWT
const requireAuth = async (req, res, next) => {
  try {
    let token;
    
    // Đọc token từ header Authorization
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    
    if (!token) {
      throw new ApiError(401, 'Vui lòng đăng nhập để truy cập tài nguyên này.');
    }
    
    // Giải mã token
    try {
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET || 'change-me-in-production-access');
      
      // Tìm user trong DB
      const user = await User.findById(decoded.id || decoded.userId);
      if (!user) {
        throw new ApiError(401, 'Tài khoản không tồn tại hoặc đã bị xóa.');
      }
      
      if (!user.isActive) {
        throw new ApiError(401, 'Tài khoản này hiện đang bị khóa.');
      }
      
      // Lưu thông tin người dùng vào request object
      req.user = user;
      next();
    } catch (err) {
      throw new ApiError(401, 'Mã xác thực (Token) không hợp lệ hoặc đã hết hạn.');
    }
  } catch (error) {
    next(error);
  }
};

// Middleware phân quyền theo vai trò (Roles)
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new ApiError(403, 'Bạn không có quyền thực hiện hành động này.'));
    }
    next();
  };
};

module.exports = {
  requireAuth,
  restrictTo
};
