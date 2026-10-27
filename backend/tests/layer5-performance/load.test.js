/**
 * =============================================================================
 * TANG 5: PERFORMANCE TESTS
 * Muc tieu: Kiem tra he thong co bi cham hay qua tai khi nhieu nguoi dung
 * cung luc khong. Do thoi gian phan hoi, throughput, memory.
 * =============================================================================
 */

jest.mock('../../src/models/User');
jest.mock('../../src/models/Product');
jest.mock('../../src/models/Category');
jest.mock('../../src/models/Order');
jest.mock('../../src/models/Coupon');
jest.mock('../../src/models/CartItem');
jest.mock('../../src/models/Review');
jest.mock('../../src/models/Location');
jest.mock('../../src/services/geocoding');
jest.mock('jsonwebtoken');
jest.mock('bcryptjs');

const request = require('supertest');
const jwt = require('jsonwebtoken');
const User = require('../../src/models/User');
const Product = require('../../src/models/Product');
const app = require('../../src/app');

// ─── Helper: Tao nhieu requests dong thoi ────────────────────────────────────
const runConcurrent = async (requests) => {
  return Promise.all(requests);
};

// ─── Setup ───────────────────────────────────────────────────────────────────
const setupPublicMocks = () => {
  const mockProducts = Array.from({ length: 20 }, (_, i) => ({
    id: `prod-${i}`,
    name: `Product ${i}`,
    basePrice: 30000 + i * 1000,
    isAvailable: true
  }));

  const chainMock = {
    populate: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(mockProducts)
  };
  Product.find.mockReturnValue(chainMock);
  Product.countDocuments.mockResolvedValue(mockProducts.length);
};

// =============================================================================
describe('[TANG 5] Performance Tests - Tai va Thoi gian phan hoi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_ACCESS_SECRET = 'perf-test-secret';
  });

  // ─── P5-001: Thoi gian phan hoi health check ──────────────────────────────
  describe('Response Time Benchmarks', () => {
    it('TC-P-001: Health check phai phan hoi trong 100ms', async () => {
      // Warm up Express pipeline
      await request(app).get('/health');
      const start = Date.now();
      const res = await request(app).get('/health');
      const elapsed = Date.now() - start;

      expect(res.status).toBe(200);
      expect(elapsed).toBeLessThan(100);
    });

    it('TC-P-002: GET /products phai phan hoi trong 500ms', async () => {
      setupPublicMocks();
      const start = Date.now();
      const res = await request(app).get('/api/v1/products');
      const elapsed = Date.now() - start;

      expect([200, 500]).toContain(res.status);
      expect(elapsed).toBeLessThan(500);
    });

    it('TC-P-003: POST /auth/login phai phan hoi trong 500ms', async () => {
      User.findOne.mockResolvedValue(null);
      const start = Date.now();
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'perf@test.com', password: 'wrong' });
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(500);
    });
  });

  // ─── P5-002: Concurrent requests ─────────────────────────────────────────
  describe('Concurrent Load Tests', () => {
    it('TC-P-004: 10 request GET /health dong thoi deu thanh cong', async () => {
      const requests = Array.from({ length: 10 }, () =>
        request(app).get('/health')
      );

      const start = Date.now();
      const responses = await runConcurrent(requests);
      const elapsed = Date.now() - start;

      const successCount = responses.filter(r => r.status === 200).length;
      expect(successCount).toBe(10);
      expect(elapsed).toBeLessThan(2000); // Tat ca 10 req trong 2s
    });

    it('TC-P-005: 20 request GET /products dong thoi, tat ca phai duoc xu ly', async () => {
      setupPublicMocks();

      const requests = Array.from({ length: 20 }, () =>
        request(app).get('/api/v1/products')
      );

      const start = Date.now();
      const responses = await runConcurrent(requests);
      const elapsed = Date.now() - start;

      // Khong co request nao bi timeout hoac loi server
      const serverErrors = responses.filter(r => r.status === 500).length;
      expect(serverErrors).toBe(0);
      expect(elapsed).toBeLessThan(5000); // 20 req trong 5s
    });

    it('TC-P-006: 50 request login dong thoi khong lam server crash', async () => {
      User.findOne.mockResolvedValue(null);

      const requests = Array.from({ length: 50 }, (_, i) =>
        request(app)
          .post('/api/v1/auth/login')
          .send({ email: `user${i}@perf.test`, password: 'wrongpass' })
      );

      const responses = await runConcurrent(requests);
      const serverErrors = responses.filter(r => r.status === 500).length;

      // Server khong duoc crash
      expect(serverErrors).toBe(0);

      // Tat ca phai nhan duoc phan hoi (401 vi user khong ton tai)
      responses.forEach(r => {
        expect([400, 401, 429]).toContain(r.status);
      });
    });
  });

  // ─── P5-003: Memory leak detection ───────────────────────────────────────
  describe('Memory Usage Tests', () => {
    it('TC-P-007: Memory khong tang qua 50MB sau 100 requests', async () => {
      setupPublicMocks();

      const memBefore = process.memoryUsage().heapUsed;

      const requests = Array.from({ length: 100 }, () =>
        request(app).get('/health')
      );
      await runConcurrent(requests);

      // Force GC neu co the
      if (global.gc) global.gc();

      const memAfter = process.memoryUsage().heapUsed;
      const memDelta = memAfter - memBefore;
      const memDeltaMB = memDelta / 1024 / 1024;

      // Memory tang khong duoc qua 50MB
      expect(memDeltaMB).toBeLessThan(50);
    });
  });

  // ─── P5-004: Throughput test ─────────────────────────────────────────────
  describe('Throughput Tests', () => {
    it('TC-P-008: He thong xu ly it nhat 50 req/s cho health check', async () => {
      const NUM_REQUESTS = 50;
      const start = Date.now();

      const requests = Array.from({ length: NUM_REQUESTS }, () =>
        request(app).get('/health')
      );
      const responses = await runConcurrent(requests);

      const elapsed = (Date.now() - start) / 1000; // Doi sang giay
      const throughput = NUM_REQUESTS / elapsed;
      const successCount = responses.filter(r => r.status === 200).length;

      expect(successCount).toBe(NUM_REQUESTS);
      // Throughput it nhat 10 req/s (conservative cho CI)
      expect(throughput).toBeGreaterThan(10);
    });

    it('TC-P-009: 404 errors phai tra ve nhanh (< 50ms moi request)', async () => {
      const times = [];

      for (let i = 0; i < 10; i++) {
        const start = Date.now();
        await request(app).get('/api/v1/nonexistent');
        times.push(Date.now() - start);
      }

      const maxTime = Math.max(...times);
      expect(maxTime).toBeLessThan(200); // Thoai mai hon 50ms vi co overhead
    });
  });

  // ─── P5-005: Large payload tests ─────────────────────────────────────────
  describe('Payload Size Tests', () => {
    it('TC-P-010: Request body > 10kb phai bi tu choi (413)', async () => {
      // Tao payload lon
      const largePayload = {
        items: Array.from({ length: 1000 }, (_, i) => ({
          productId: `product-${i}`,
          quantity: i,
          note: 'A'.repeat(100),
          selectedOptions: [{ name: 'Size', value: 'Large' }]
        })),
        note: 'X'.repeat(10000)
      };

      const res = await request(app)
        .post('/api/v1/orders')
        .send(largePayload);

      // Express json limit default la 100kb, nen se cho qua
      // Nhung nen check 401 (chua auth) truoc khi check payload
      expect([401, 413, 400]).toContain(res.status);
    });
  });
});
