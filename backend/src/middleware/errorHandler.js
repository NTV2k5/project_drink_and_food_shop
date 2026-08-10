// Custom ApiError Class để ném ra lỗi có status code xác định
class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Middleware xử lý lỗi tập trung (Centralized Error Handler)
const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  console.error(`[ERROR] [${req.method} ${req.originalUrl}] - Message: ${err.message}`);
  if (err.stack && process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }

  // Lỗi trùng lặp dữ liệu (MongoDB Duplicate Key Error)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      success: false,
      message: `Giá trị của trường '${field}' đã tồn tại trong hệ thống. Vui lòng chọn giá trị khác.`
    });
  }

  // Lỗi Mongoose Validation Error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(el => el.message);
    return res.status(400).json({
      success: false,
      message: `Dữ liệu không hợp lệ: ${messages.join('. ')}`
    });
  }

  // Lỗi CastError (ID không hợp lệ trong MongoDB)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: `Mã định danh (ID) '${err.value}' không đúng định dạng.`
    });
  }

  // Trả về phản hồi JSON chuẩn hóa
  res.status(err.statusCode).json({
    success: false,
    message: err.message || 'Lỗi hệ thống nội bộ.'
  });
};

module.exports = {
  ApiError,
  errorHandler
};
