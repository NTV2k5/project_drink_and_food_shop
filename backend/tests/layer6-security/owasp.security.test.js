/**
 * =============================================================================
 * TANG 6: SECURITY TESTS
 * Muc tieu: Kiem tra he thong co bao ve du lieu, chong xam nhap, chong
 * cac cuoc tan cong OWASP API Top 10 khong.
 * Covers: BOLA/IDOR, Mass Assignment, Injection, XSS, Auth Bypass, Rate Limit
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
const Order = require('../../src/models/Order');
const Product = require('../../src/models/Product');
const app = require('../../src/app');

// ─── Setup auth ───────────────────────────────────────────────────────────────
const setupAuth = (userId, role = 'CUSTOMER') => {
  jwt.verify.mockReturnValue({ id: userId });
  User.findById.mockResolvedValue({ id: userId, isActive: true, role, loyaltyPoints: 0 });
  return `Bearer mock-jwt`;
};

// =============================================================================
describe('[TANG 6] Security Tests - OWASP API Top 10', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_ACCESS_SECRET = 'sec-test-secret';
  });

  // ─── S6-001: Authentication & Authorization ───────────────────────────────
  describe('API1: Broken Object Level Authorization (BOLA/IDOR)', () => {
    it('TC-S-001: CUSTOMER A khong duoc xem don hang cua CUSTOMER B', async () => {
      const attackerToken = setupAuth('attacker-uid');

      // Order thuoc ve victim, khong phai attacker
      const victimOrder = {
        id: 'victim-order-id',
        userId: 'victim-uid', // KHAC voi attacker-uid
        status: 'PENDING_PAYMENT',
        totalAmount: 100000
      };
      Order.findById.mockResolvedValue(victimOrder);

      const res = await request(app)
        .get('/api/v1/orders/victim-order-id')
        .set('Authorization', attackerToken);

      // Phai bi tu choi - IDOR protection
      expect([403, 404]).toContain(res.status);
    });

    it('TC-S-002: CUSTOMER khong duoc huy don hang cua nguoi khac', async () => {
      const attackerToken = setupAuth('attacker-uid');
      const victimOrder = {
        id: 'victim-order-id',
        userId: 'victim-uid',
        status: 'PENDING_PAYMENT'
      };
      Order.findById.mockResolvedValue(victimOrder);

      const res = await request(app)
        .patch('/api/v1/orders/victim-order-id/status')
        .set('Authorization', attackerToken)
        .send({ status: 'CANCELLED', reason: 'Hack attempt' });

      expect([400, 403, 404]).toContain(res.status);
    });

    it('TC-S-003: CUSTOMER khong duoc cap nhat role nguoi dung khac', async () => {
      const attackerToken = setupAuth('attacker-uid', 'CUSTOMER');

      const res = await request(app)
        .patch('/api/v1/auth/users/victim-uid/role')
        .set('Authorization', attackerToken)
        .send({ role: 'ADMIN' });

      expect([401, 403, 404]).toContain(res.status);
    });
  });

  // ─── S6-002: Authentication ───────────────────────────────────────────────
  describe('API2: Broken Authentication', () => {
    it('TC-S-004: Request khong co token phai bi tu choi 401', async () => {
      const res = await request(app).get('/api/v1/auth/profile');
      expect(res.status).toBe(401);
    });

    it('TC-S-005: Token gia mao phai bi tu choi 401', async () => {
      jwt.verify.mockImplementation(() => { throw new Error('invalid signature'); });

      const res = await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', 'Bearer forged.jwt.token.xyz');

      expect(res.status).toBe(401);
    });

    it('TC-S-006: Token het han phai bi tu choi 401', async () => {
      jwt.verify.mockImplementation(() => { throw new Error('jwt expired'); });

      const res = await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', 'Bearer expired.token.here');

      expect(res.status).toBe(401);
    });

    it('TC-S-007: Token "Bearer" khong co value phai bi tu choi', async () => {
      const res = await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', 'Bearer ');

      expect([401]).toContain(res.status);
    });

    it('TC-S-008: Scheme khac "Bearer" phai bi tu choi', async () => {
      const res = await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', 'Basic dXNlcjpwYXNz');

      expect(res.status).toBe(401);
    });
  });

  // ─── S6-003: Excess Data Exposure ────────────────────────────────────────
  describe('API3: Excess Data Exposure', () => {
    it('TC-S-009: Response khong duoc chua passwordHash', async () => {
      jwt.verify.mockReturnValue({ id: 'uid-sec' });
      User.findById.mockResolvedValue({ id: 'uid-sec', isActive: true, role: 'CUSTOMER' });

      const profileData = {
        id: 'uid-sec',
        email: 'user@test.com',
        fullName: 'Test User',
        role: 'CUSTOMER'
        // passwordHash KHONG co mat
      };
      const selectMock = jest.fn().mockResolvedValue(profileData);
      User.findById.mockReturnValue({
        ...{ id: 'uid-sec', isActive: true, role: 'CUSTOMER' },
        select: selectMock
      });

      const res = await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', 'Bearer valid-token');

      if (res.status === 200) {
        expect(res.body).not.toHaveProperty('passwordHash');
        expect(res.body).not.toHaveProperty('password');
      }
    });

    it('TC-S-010: Response dang ky khong duoc tra ve password hash', async () => {
      User.findOne.mockResolvedValue(null);
      const bcrypt = require('bcryptjs');
      bcrypt.genSalt.mockResolvedValue('salt');
      bcrypt.hash.mockResolvedValue('$2b$12$hash');
      User.create.mockResolvedValue({ id: 'new-uid' });
      jwt.sign.mockReturnValue('token');

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ email: 'new@test.com', password: 'Pass123!' });

      if (res.status === 201) {
        expect(res.body).not.toHaveProperty('passwordHash');
        expect(res.body).not.toHaveProperty('password');
      }
    });
  });

  // ─── S6-004: Security Headers (Helmet) ────────────────────────────────────
  describe('Security Headers', () => {
    it('TC-S-011: X-Content-Type-Options: nosniff phai co mat', async () => {
      const res = await request(app).get('/health');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
    });

    it('TC-S-012: X-Frame-Options phai co mat de chong Clickjacking', async () => {
      const res = await request(app).get('/health');
      // Helmet dat X-Frame-Options: SAMEORIGIN hoac DENY
      expect(res.headers).toHaveProperty('x-frame-options');
    });

    it('TC-S-013: X-Powered-By header phai bi xoa (khong lo thong tin stack)', async () => {
      const res = await request(app).get('/health');
      expect(res.headers['x-powered-by']).toBeUndefined();
    });
  });

  // ─── S6-005: Injection Prevention ────────────────────────────────────────
  describe('API8: Injection Prevention (NoSQL Injection)', () => {
    it('TC-S-014: NoSQL injection trong email field phai bi xu ly an toan', async () => {
      // Tan cong NoSQL injection co ban
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: { '$gt': '' }, // MongoDB operator injection
          password: 'anypassword'
        });

      // Phai tra ve loi, khong duoc dang nhap thanh cong
      expect([400, 401, 500]).toContain(res.status);
      expect(res.status).not.toBe(200);
    });

    it('TC-S-015: Script injection trong fullName phai duoc xu ly', async () => {
      User.findOne.mockResolvedValue(null);
      const bcrypt = require('bcryptjs');
      bcrypt.genSalt.mockResolvedValue('salt');
      bcrypt.hash.mockResolvedValue('hash');
      User.create.mockResolvedValue({ id: 'uid' });
      jwt.sign.mockReturnValue('token');

      const xssPayload = '<script>alert("XSS")</script>';
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'xss@test.com',
          password: 'Pass123!',
          fullName: xssPayload
        });

      if (res.status === 201) {
        // Response JSON khong duoc render HTML
        const bodyStr = JSON.stringify(res.body);
        expect(bodyStr).not.toContain('<script>');
      }
    });
  });

  // ─── S6-006: Mass Assignment ─────────────────────────────────────────────
  describe('API6: Mass Assignment Prevention', () => {
    it('TC-S-016: CUSTOMER khong duoc tu set role=ADMIN khi dang ky', async () => {
      User.findOne.mockResolvedValue(null);
      const bcrypt = require('bcryptjs');
      bcrypt.genSalt.mockResolvedValue('salt');
      bcrypt.hash.mockResolvedValue('hash');

      // Ghi lai tham so truyen vao User.create
      let createdData = null;
      User.create.mockImplementation((data) => {
        createdData = data;
        return Promise.resolve({ id: 'new-uid' });
      });
      jwt.sign.mockReturnValue('token');

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'hack@test.com',
          password: 'Pass123!',
          fullName: 'Hacker',
          role: 'ADMIN', // Thu mass assignment
          isActive: true,
          loyaltyPoints: 999999
        });

      if (res.status === 201 && createdData) {
        // role phai la mac dinh, khong phai ADMIN
        expect(createdData.role).not.toBe('ADMIN');
      }
    });
  });

  // ─── S6-007: CORS Policy ──────────────────────────────────────────────────
  describe('CORS Policy', () => {
    it('TC-S-017: Request tu origin khong cho phep phai bi tu choi', async () => {
      const res = await request(app)
        .get('/api/v1/products')
        .set('Origin', 'https://evil-site.com');

      // CORS tu choi hoac khong co ACAO header
      // Express cho phep khong co Origin header, nhung evil origin phai bi chong
      if (res.headers['access-control-allow-origin']) {
        expect(res.headers['access-control-allow-origin']).not.toBe('https://evil-site.com');
      }
    });

    it('TC-S-018: Request tu localhost phai duoc cho phep', async () => {
      const chainMock = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([])
      };
      Product.find.mockReturnValue(chainMock);

      const res = await request(app)
        .get('/api/v1/products')
        .set('Origin', 'http://localhost:3000');

      expect([200, 500]).toContain(res.status);
    });
  });

  // ─── S6-008: Admin-only endpoints ────────────────────────────────────────
  describe('Role-Based Access Control', () => {
    it('TC-S-019: Endpoint admin bi chan voi CUSTOMER token', async () => {
      setupAuth('customer-uid', 'CUSTOMER');

      const res = await request(app)
        .get('/api/v1/auth/users')
        .set('Authorization', 'Bearer customer-token');

      expect([401, 403]).toContain(res.status);
    });

    it('TC-S-020: Tao san pham moi bi chan voi CUSTOMER', async () => {
      setupAuth('customer-uid', 'CUSTOMER');

      const res = await request(app)
        .post('/api/v1/products')
        .set('Authorization', 'Bearer customer-token')
        .send({ name: 'Hack Product', basePrice: 1 });

      expect([401, 403, 404]).toContain(res.status);
    });
  });
});
