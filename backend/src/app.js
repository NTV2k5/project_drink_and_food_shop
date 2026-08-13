const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const loggerMiddleware = require('./middleware/logger');
const { errorHandler } = require('./middleware/errorHandler');
const apiRouter = require('./routes/index');

const app = express();

// 1. Cấu hình CORS mở rộng cho phép kết nối liên thông frontend (Port 3000)
const allowedOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',').map(s => s.trim().replace(/\/$/, '')) 
  : ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:3001', 'http://127.0.0.1:3001'];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    
    const cleanOrigin = origin.replace(/\/$/, '');
    const isLocalhost = cleanOrigin.startsWith('http://localhost:') || cleanOrigin.startsWith('http://127.0.0.1:');
    const isVercel = cleanOrigin.endsWith('.vercel.app');
    
    if (allowedOrigins.includes(cleanOrigin) || allowedOrigins.includes('*') || isLocalhost || isVercel) {
      callback(null, true);
    } else {
      callback(new Error('Chặn bởi cấu hình CORS. Không cho phép truy cập từ origin này.'));
    }
  },
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  optionsSuccessStatus: 204
};

// Xử lý tất cả preflight OPTIONS request TRƯỚC KHI Helmet chạy
app.options('*', cors(corsOptions));
app.use(cors(corsOptions));

// 2. Cấu hình bảo mật HTTP headers bằng Helmet
app.use(helmet());

// 3. Phân tích cú pháp request body (Parsers)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 4. Ghi nhận nhật ký request (Morgan + Custom Logger Middleware)
app.use(morgan('dev'));
app.use(loggerMiddleware);

// 5. Đăng ký các route API chính thức với tiền tố /api/v1
app.use('/api/v1', apiRouter);

// Health check endpoint — dùng cho Docker HEALTHCHECK và monitoring
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Tích hợp Swagger API Documentation
const setupSwagger = require('./config/swagger');
setupSwagger(app);

// 6. Xử lý khi truy cập các route không tồn tại (404 Not Found)
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Đường dẫn ${req.method} ${req.originalUrl} không tồn tại trên hệ thống.`
  });
});

// 7. Đăng ký Middleware xử lý lỗi tập trung cuối cùng
app.use(errorHandler);

module.exports = app;
