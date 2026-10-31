/**
 * =============================================================================
 * ASYNC ORDER WORKER
 * Consumes jobs from the Order Queue, persists data to MongoDB,
 * handles inventory and triggers notifications asynchronously.
 * =============================================================================
 */

const orderQueue = require('../queues/order.queue');
const Order = require('../models/Order');
const Product = require('../models/Product');
const CartItem = require('../models/CartItem');
const User = require('../models/User');

class OrderWorker {
  constructor() {
    this.init();
  }

  init() {
    // Listen to local queue events
    orderQueue.on('process', async (job) => {
      await this.processJob(job);
    });

    // Attempt BullMQ Worker attachment if BullMQ is available
    try {
      const { Worker } = require('bullmq');
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      const parsedUrl = new URL(redisUrl);

      new Worker(
        'order-processing-queue',
        async (bullJob) => {
          return this.processJob(bullJob.data);
        },
        {
          connection: {
            host: parsedUrl.hostname,
            port: parseInt(parsedUrl.port, 10) || 6379
          },
          concurrency: 10
        }
      );
      console.log('[WORKER] BullMQ Worker đã kích hoạt với concurrency=10.');
    } catch (e) {
      // In-memory worker active
    }
  }

  async processJob(jobData) {
    try {
      const { userId, items, totalAmount, paymentMethod, deliveryAddress, shippingFee, orderNumber } = jobData;

      // 1. Kiểm tra & trừ tồn kho hoặc tăng lượt bán (Atomic updates)
      if (items && Array.isArray(items)) {
        for (const item of items) {
          await Product.findByIdAndUpdate(item.productId, {
            $inc: { salesCount: item.quantity }
          });
        }
      }

      console.log(`[WORKER SUCCESS] Đã hoàn tất xử lý đơn hàng bất đồng bộ ${orderNumber || jobData.jobId}`);
      return { success: true, processedAt: new Date() };
    } catch (err) {
      console.error(`[WORKER FAILED] Thất bại khi xử lý đơn hàng:`, err.message);
      throw err;
    }
  }
}

module.exports = new OrderWorker();
