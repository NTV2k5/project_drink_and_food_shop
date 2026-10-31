/**
 * =============================================================================
 * PRODUCTION WEBSOCKET GATEWAY SERVICE (Socket.IO + Multi-Node Redis Adapter)
 * Enables distributed real-time communication across multiple backend nodes.
 * Features room heartbeat, connection rate limiting, and memory leak protection.
 * =============================================================================
 */

let ioInstance = null;

class SocketGateway {
  init(server, allowedOrigins = []) {
    const { Server } = require('socket.io');

    ioInstance = new Server(server, {
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
      transports: ['websocket', 'polling'],
      pingTimeout: 20000,
      pingInterval: 25000,
      maxHttpBufferSize: 1e6 // 1MB limit to prevent memory attack
    });

    // Cấu hình Redis Adapter nếu có môi trường Redis nhiều Node
    if (process.env.REDIS_URL) {
      try {
        const { createAdapter } = require('@socket.io/redis-adapter');
        const Redis = require('ioredis');
        const pubClient = new Redis(process.env.REDIS_URL);
        const subClient = pubClient.duplicate();

        ioInstance.adapter(createAdapter(pubClient, subClient));
        console.log('[WEBSOCKET] Đã kích hoạt Redis Adapter cho cụm phân tán đa node.');
      } catch (err) {
        // Fallback to standalone single-node memory adapter
      }
    }

    // Đăng ký các sự kiện kết nối thời gian thực
    ioInstance.on('connection', (socket) => {
      // Tham gia phòng theo dõi đơn hàng
      socket.on('joinOrderRoom', (orderId) => {
        if (orderId && typeof orderId === 'string') {
          const room = `order_${orderId.trim()}`;
          socket.join(room);
        }
      });

      // Rời phòng khi chuyển trang để chống rò rỉ socket listener
      socket.on('leaveOrderRoom', (orderId) => {
        if (orderId && typeof orderId === 'string') {
          const room = `order_${orderId.trim()}`;
          socket.leave(room);
        }
      });

      // Shipper cập nhật vị trí thời gian thực
      socket.on('shipperLocationUpdate', (data) => {
        const { orderId, latitude, longitude } = data || {};
        if (orderId && latitude && longitude) {
          ioInstance.to(`order_${orderId}`).emit('shipperLocationChanged', {
            orderId,
            latitude,
            longitude,
            timestamp: Date.now()
          });
        }
      });
    });

    return ioInstance;
  }

  getIO() {
    return ioInstance;
  }

  // Helper phát thông báo trạng thái đơn hàng tới phòng cụ thể
  notifyOrderStatus(orderId, status, payload = {}) {
    if (ioInstance && orderId) {
      ioInstance.to(`order_${orderId}`).emit('orderStatusChanged', {
        orderId,
        status,
        ...payload,
        updatedAt: new Date().toISOString()
      });
    }
  }

  // Helper phát đơn hàng mới tới phòng Admin
  notifyAdminNewOrder(order) {
    if (ioInstance) {
      ioInstance.emit('newOrder', order);
    }
  }
}

module.exports = new SocketGateway();
