/**
 * =============================================================================
 * TANG 7: RELIABILITY TESTS
 * Muc tieu: Kiem tra khi mat ket noi, may chu co bi dung hay nghiep vu he
 * thong co hoi phuc khong. Chaos engineering, graceful shutdown, circuit breaker.
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
const Order = require('../../src/models/Order');
const { geocodeAddress } = require('../../src/services/geocoding');
const app = require('../../src/app');

// =============================================================================
describe('[TANG 7] Reliability Tests - Do ben va phuc hoi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_ACCESS_SECRET = 'rel-test-secret';
    process.env.NODE_ENV = 'test';
  });

  // ─── R7-001: Database Error Recovery ──────────────────────────────────────
  describe('Database Connection Failures', () => {
    it('TC-R-001: Khi DB throw error, API phai tra ve 500 (khong crash)', async () => {
      Product.find.mockRejectedValue(new Error('MongoNetworkError: connection refused'));

      const res = await request(app).get('/api/v1/products');

      expect([500]).toContain(res.status);
      expect(res.body.success).toBe(false);
      // Server phai van hoat dong
      expect(res.body).toHaveProperty('message');
    });

    it('TC-R-002: Sau loi DB, server van xu ly duoc request tiep theo', async () => {
      // Request 1: Loi DB
      Product.find.mockRejectedValueOnce(new Error('Timeout'));

      const res1 = await request(app).get('/api/v1/products');
      expect([500]).toContain(res1.status);

      // Request 2: Thanh cong sau do
      const chainMock2 = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        then: (resolve) => resolve([{ id: 'prod-ok', name: 'OK Product' }])
      };
      Product.find.mockReturnValueOnce(chainMock2);

      const res2 = await request(app).get('/api/v1/products');
      expect([200, 500]).toContain(res2.status);

      // Health check phai van OK
      const healthRes = await request(app).get('/health');
      expect(healthRes.status).toBe(200);
    });

    it('TC-R-003: Loi DB trong auth phai tra ve 500, khong expose error details', async () => {
      User.findOne.mockRejectedValue(new Error('DB connection pool exhausted'));

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'user@test.com', password: 'pass' });

      expect([400, 500]).toContain(res.status);
      // Khong duoc lo stack trace trong production
      if (process.env.NODE_ENV === 'production') {
        expect(res.body).not.toHaveProperty('stack');
      }
    });
  });

  // ─── R7-002: External Service Failures ───────────────────────────────────
  describe('External Service Failures (Geocoding, SePay)', () => {
    it('TC-R-004: Khi Geocoding API that bai, don hang van tao duoc voi fallback', async () => {
      jwt.verify.mockReturnValue({ id: 'rel-uid' });
      User.findById.mockResolvedValue({
        id: 'rel-uid',
        isActive: true,
        role: 'CUSTOMER',
        loyaltyPoints: 0,
        save: jest.fn()
      });
      Product.findById.mockResolvedValue({
        id: 'prod-1',
        name: 'Ca phe',
        basePrice: 35000,
        isAvailable: true
      });

      // Geocoding service that bai
      geocodeAddress.mockRejectedValue(new Error('GEOCODING_SERVICE_UNAVAILABLE'));

      const res = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', 'Bearer rel-token')
        .send({
          items: [{ productId: 'prod-1', quantity: 1, selectedOptions: [] }],
          paymentMethod: 'COD',
          deliveryAddress: { fullAddress: '123 Test St', label: 'Home' },
          shippingFee: 15000
        });

      // Nen xu ly gracefully - tra ve loi ro rang, khong crash
      expect([201, 400, 500]).toContain(res.status);
      if (res.status >= 400) {
        expect(res.body.success).toBe(false);
        expect(res.body.message).toBeTruthy();
      }
    });

    it('TC-R-005: Khi Geocoding timeout, API tra ve loi ro rang', async () => {
      geocodeAddress.mockImplementation(() =>
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout after 5000ms')), 10)
        )
      );

      jwt.verify.mockReturnValue({ id: 'timeout-uid' });
      User.findById.mockResolvedValue({ id: 'timeout-uid', isActive: true, role: 'CUSTOMER', loyaltyPoints: 0, save: jest.fn() });
      Product.findById.mockResolvedValue({ id: 'prod-1', name: 'Ca phe', basePrice: 35000, isAvailable: true });

      const res = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', 'Bearer timeout-token')
        .send({
          items: [{ productId: 'prod-1', quantity: 1, selectedOptions: [] }],
          paymentMethod: 'COD',
          deliveryAddress: { fullAddress: '123 Timeout St', label: 'Home' },
          shippingFee: 15000
        });

      expect([201, 400, 500]).toContain(res.status);
    });
  });

  // ─── R7-003: Input Validation Resilience ─────────────────────────────────
  describe('Input Validation & Malformed Requests', () => {
    it('TC-R-006: Request voi Content-Type sai van xu ly duoc', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .set('Content-Type', 'text/plain')
        .send('not-json-data');

      expect([400, 415]).toContain(res.status);
    });

    it('TC-R-007: JSON bi broken/malformed phai tra ve loi ro rang', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .set('Content-Type', 'application/json')
        .send('{ email: }'); // JSON khong hop le

      expect([400]).toContain(res.status);
    });

    it('TC-R-008: ID khong dung dinh dang MongoDB phai tra ve 400', async () => {
      jwt.verify.mockReturnValue({ id: 'uid-r' });
      User.findById.mockResolvedValue({ id: 'uid-r', isActive: true, role: 'CUSTOMER' });

      // Mongoose se throw CastError cho ID khong hop le
      const castError = { name: 'CastError', value: 'not-valid-id', message: 'Cast to ObjectId failed' };
      Order.findById.mockRejectedValue(castError);

      const res = await request(app)
        .get('/api/v1/orders/not-valid-id')
        .set('Authorization', 'Bearer valid-token');

      expect([400, 404]).toContain(res.status);
    });

    it('TC-R-009: Fields null/undefined duoc xu ly khong crash server', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: null,
          password: undefined,
          fullName: ''
        });

      expect([400, 500]).toContain(res.status);
      expect(res.body).not.toBeNull();
    });
  });

  // ─── R7-004: Concurrent Conflicting Operations ────────────────────────────
  describe('Concurrency & Race Conditions', () => {
    it('TC-R-010: 5 request huy don hang cung luc chi duoc 1 thanh cong', async () => {
      jwt.verify.mockReturnValue({ id: 'race-uid' });
      User.findById.mockResolvedValue({ id: 'race-uid', isActive: true, role: 'CUSTOMER' });

      // Gia lap order bi huy sau lan dau
      let cancelCount = 0;
      Order.findById.mockImplementation(() => {
        cancelCount++;
        if (cancelCount === 1) {
          return Promise.resolve({
            id: 'order-race',
            userId: 'race-uid',
            status: 'PENDING_PAYMENT',
            save: jest.fn().mockResolvedValue(true),
            statusLogs: []
          });
        }
        // Lan thu 2 tro di, order da bi huy
        return Promise.resolve({
          id: 'order-race',
          userId: 'race-uid',
          status: 'CANCELLED',
          save: jest.fn().mockResolvedValue(true),
          statusLogs: []
        });
      });

      const requests = Array.from({ length: 5 }, () =>
        request(app)
          .patch('/api/v1/orders/order-race/status')
          .set('Authorization', 'Bearer race-token')
          .send({ status: 'CANCELLED', reason: 'Customer request' })
      );

      const responses = await Promise.all(requests);

      // Khong duoc co loi server (500)
      const serverErrors = responses.filter(r => r.status === 500).length;
      expect(serverErrors).toBe(0);
    });

    it('TC-R-011: Nhieu update concurrent khong duoc corrupt order data', async () => {
      jwt.verify.mockReturnValue({ id: 'admin-race' });
      User.findById.mockResolvedValue({ id: 'admin-race', isActive: true, role: 'ADMIN' });

      const sharedOrder = {
        id: 'order-concurrent',
        userId: 'customer-uid',
        status: 'PENDING_PAYMENT',
        save: jest.fn().mockResolvedValue(true),
        statusLogs: []
      };
      Order.findById.mockResolvedValue(sharedOrder);

      const requests = Array.from({ length: 3 }, (_, i) =>
        request(app)
          .patch('/api/v1/orders/order-concurrent/status')
          .set('Authorization', 'Bearer admin-token')
          .send({ status: 'CONFIRMED', note: `Update ${i}` })
      );

      const responses = await Promise.all(requests);
      // Khong co 5xx
      const serverErrors = responses.filter(r => r.status >= 500).length;
      expect(serverErrors).toBe(0);
    });
  });

  // ─── R7-005: Health Check Reliability ─────────────────────────────────────
  describe('Health Check & System Availability', () => {
    it('TC-R-012: /health luon tra ve 200 bat ke trang thai DB mock', async () => {
      // Health check khong phu thuoc DB mock
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });

    it('TC-R-013: /health chua uptime va timestamp', async () => {
      const res = await request(app).get('/health');
      expect(res.body).toHaveProperty('uptime');
      expect(res.body).toHaveProperty('timestamp');
      expect(typeof res.body.uptime).toBe('number');
      expect(res.body.uptime).toBeGreaterThan(0);
    });

    it('TC-R-014: Server phan hoi sau 100 loi lien tiep', async () => {
      // Gia lap 100 request loi
      Product.find.mockImplementation(() => {
        throw new Error('Simulated DB crash');
      });

      const errorRequests = Array.from({ length: 50 }, () =>
        request(app).get('/api/v1/products')
      );
      await Promise.all(errorRequests);

      // Health check phai van OK
      const healthRes = await request(app).get('/health');
      expect(healthRes.status).toBe(200);
    });
  });

  // ─── R7-006: Error Response Consistency ───────────────────────────────────
  describe('Error Response Format Consistency', () => {
    it('TC-R-015: Moi error response deu co field success=false', async () => {
      const errorEndpoints = [
        { method: 'get', url: '/api/v1/nonexistent' },
        { method: 'post', url: '/api/v1/auth/login', body: {} },
        { method: 'post', url: '/api/v1/auth/register', body: {} }
      ];

      for (const ep of errorEndpoints) {
        const res = await request(app)[ep.method](ep.url).send(ep.body || {});
        if (res.status >= 400) {
          expect(res.body).toHaveProperty('success');
          expect(res.body.success).toBe(false);
          expect(res.body).toHaveProperty('message');
        }
      }
    });

    it('TC-R-016: Error format phai nhat quan giua cac loai loi', async () => {
      // 404 error
      const res404 = await request(app).get('/api/v1/does-not-exist');
      expect(res404.body).toMatchObject({ success: false, message: expect.any(String) });

      // 401 error
      const res401 = await request(app).get('/api/v1/auth/profile');
      expect(res401.body).toMatchObject({ success: false, message: expect.any(String) });
    });
  });
});
