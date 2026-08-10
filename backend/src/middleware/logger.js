// Middleware ghi nhận nhật ký (log) các request đến server
const loggerMiddleware = (req, res, next) => {
  const start = Date.now();
  
  // Khi request hoàn thành, log thông tin
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - Trạng thái: ${res.statusCode} - Thời gian: ${duration}ms - IP: ${req.ip}`
    );
  });
  
  next();
};

module.exports = loggerMiddleware;
