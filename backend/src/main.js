require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 4000;

// 1. Thực hiện kết nối tới cơ sở dữ liệu MongoDB
connectDB();

// 2. Khởi tạo HTTP server từ Express Application
const server = http.createServer(app);

// 3. Khởi tạo cổng kết nối WebSocket bằng Socket.IO và cấu hình CORS
const allowedOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',').map(s => s.trim().replace(/\/$/, '')) 
  : ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:3001', 'http://127.0.0.1:3001'];

const io = new Server(server, {
  cors: {
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      const cleanOrigin = origin.replace(/\/$/, '');
      const isLocalhost = cleanOrigin.startsWith('http://localhost:') || cleanOrigin.startsWith('http://127.0.0.1:');
      const isVercel = cleanOrigin.endsWith('.vercel.app');
      if (allowedOrigins.includes(cleanOrigin) || allowedOrigins.includes('*') || isLocalhost || isVercel) {
        callback(null, true);
      } else {
        callback(new Error('CORS block'));
      }
    },
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// 4. Đăng ký instance của io vào Express App để sử dụng trực tiếp trong các Controller thông qua req.app.get('io')
app.set('io', io);

// 5. Cấu hình các sự kiện kết nối thời gian thực (Real-time Websocket events)
io.on('connection', (socket) => {
  console.log(`🔌 Thiết bị kết nối WebSocket thành công: Socket ID = ${socket.id}`);

  // Lắng nghe sự kiện khách hàng hoặc shipper tham gia phòng theo dõi đơn hàng cụ thể
  socket.on('joinOrderRoom', (orderId) => {
    if (orderId) {
      socket.join(`order_${orderId}`);
      console.log(`Socket ${socket.id} đã tham gia vào phòng: order_${orderId}`);
    }
  });

  // Lắng nghe shipper cập nhật vị trí thời gian thực và phát lại cho khách hàng
  socket.on('shipperLocationUpdate', (data) => {
    const { orderId, latitude, longitude } = data;
    if (orderId && latitude && longitude) {
      io.to(`order_${orderId}`).emit('shipperLocationChanged', {
        orderId,
        latitude,
        longitude
      });
    }
  });

  // Sự kiện ngắt kết nối
  socket.on('disconnect', () => {
    console.log(`Thiết bị ngắt kết nối: Socket ID = ${socket.id}`);
  });
});

// 5. Khởi động Background Order Worker xử lý hàng đợi bất đồng bộ
require('./workers/order.worker');

// 6. Lắng nghe yêu cầu kết nối với TCP SYN backlog mở rộng (2048) chống nghẽn kết nối
server.listen(PORT, '0.0.0.0', 2048, () => {
  console.log(`API chạy tại: http://localhost:${PORT}/api/v1`);
  console.log(`Cổng thời gian thực WebSocket: ws://localhost:${PORT}`);
});
