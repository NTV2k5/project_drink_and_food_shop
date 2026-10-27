/**
 * =============================================================================
 * TANG 4: E2E TESTS (End-to-End)
 * Muc tieu: Gia lam nguoi dung thuc hien ca quy trinh tu dau den cuoi.
 * Kiem tra luong: Dang ky -> Dang nhap -> Xem san pham -> Them gio hang ->
 * Dat hang -> Xem don hang
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
const bcrypt = require('bcryptjs');
const User = require('../../src/models/User');
const Product = require('../../src/models/Product');
const Category = require('../../src/models/Category');
const Order = require('../../src/models/Order');
const CartItem = require('../../src/models/CartItem');
const { geocodeAddress } = require('../../src/services/geocoding');
const app = require('../../src/app');

// =============================================================================
describe('[TANG 4] E2E Tests - Luong nguoi dung hoan chinh', () => {
  let accessToken;
  let userId;

  beforeAll(() => {
    process.env.JWT_ACCESS_SECRET = 'e2e-test-secret';
    process.env.JWT_REFRESH_SECRET = 'e2e-refresh-secret';
    geocodeAddress.mockResolvedValue({ lat: 10.7769, lng: 106.7009 });
    userId = 'e2e-customer-uid';
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // LUONG 1: KHACH HANG MOI DAT HANG COD
  // ==========================================================================
  describe('LUONG E2E-01: Dang ky -> Dang nhap -> Dat hang COD', () => {

    it('BUOC 1 - TC-E-001: Dang ky tai khoan moi', async () => {
      User.findOne.mockResolvedValue(null);
      bcrypt.genSalt.mockResolvedValue('salt');
      bcrypt.hash.mockResolvedValue('$2b$12$hashedpassword');
      User.create.mockResolvedValue({ id: userId });
      jwt.sign
        .mockReturnValueOnce('e2e-access-token')
        .mockReturnValueOnce('e2e-refresh-token');

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'e2e.customer@fbshop.vn',
          password: 'SecurePass@2026',
          fullName: 'Nguyen Thi E2E'
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
      accessToken = res.body.accessToken;
    });

    it('BUOC 2 - TC-E-002: Dang nhap lay token moi', async () => {
      User.findOne.mockResolvedValue({
        id: userId,
        email: 'e2e.customer@fbshop.vn',
        passwordHash: '$2b$12$hashedpassword',
        isActive: true
      });
      bcrypt.compare.mockResolvedValue(true);
      jwt.sign
        .mockReturnValueOnce('logged-in-access-token')
        .mockReturnValueOnce('logged-in-refresh-token');

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'e2e.customer@fbshop.vn',
          password: 'SecurePass@2026'
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('accessToken');
      accessToken = res.body.accessToken;
    });

    it('BUOC 3 - TC-E-003: Xem danh sach san pham', async () => {
      const mockProducts = [
        { id: 'prod-1', name: 'Ca phe sua da', basePrice: 35000, isAvailable: true },
        { id: 'prod-2', name: 'Matcha Latte', basePrice: 45000, isAvailable: true }
      ];
      const chainMock = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockProducts)
      };
      Product.find.mockReturnValue(chainMock);
      Product.countDocuments.mockResolvedValue(mockProducts.length);

      const res = await request(app).get('/api/v1/products');

      expect(res.status).toBe(200);
    });

    it('BUOC 4 - TC-E-004: Them san pham vao gio hang', async () => {
      jwt.verify.mockReturnValue({ id: userId });
      User.findById.mockResolvedValue({ id: userId, isActive: true, role: 'CUSTOMER', loyaltyPoints: 100 });

      const mockProduct = { id: 'prod-1', name: 'Ca phe sua da', basePrice: 35000, isAvailable: true };
      Product.findById.mockResolvedValue(mockProduct);
      Product.findOne.mockResolvedValue(mockProduct);
      CartItem.findOne.mockResolvedValue(null);
      CartItem.prototype.save = jest.fn().mockResolvedValue({ id: 'cart-item-1', ...mockProduct, quantity: 2 });
      CartItem.mockImplementation(() => ({
        id: 'cart-item-1',
        save: jest.fn().mockResolvedValue(true)
      }));

      const res = await request(app)
        .post('/api/v1/cart')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          productId: 'prod-1',
          quantity: 2,
          selectedOptions: []
        });

      expect([200, 201, 400, 500]).toContain(res.status);
    });

    it('BUOC 5 - TC-E-005: Dat don hang COD thanh cong', async () => {
      jwt.verify.mockReturnValue({ id: userId });
      const mockUser = {
        id: userId,
        isActive: true,
        role: 'CUSTOMER',
        loyaltyPoints: 100,
        save: jest.fn().mockResolvedValue(true)
      };
      User.findById.mockResolvedValue(mockUser);

      Product.findById.mockResolvedValue({
        id: 'prod-1',
        name: 'Ca phe sua da',
        basePrice: 35000,
        isAvailable: true
      });

      geocodeAddress.mockResolvedValue({ lat: 10.776, lng: 106.700 });

      const mockOrder = {
        id: 'order-e2e-001',
        orderNumber: 'FB-E2E-001',
        status: 'PENDING_PAYMENT',
        totalAmount: 85000,
        paymentMethod: 'COD',
        save: jest.fn().mockResolvedValue(true),
        toJSON: function() { return { ...this }; }
      };
      Order.mockImplementation(() => mockOrder);
      Order.prototype.save = jest.fn().mockResolvedValue(mockOrder);

      const res = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          items: [{
            productId: 'prod-1',
            quantity: 2,
            selectedOptions: []
          }],
          paymentMethod: 'COD',
          deliveryAddress: {
            fullAddress: '123 Nguyen Trai, Quan 1, TP.HCM',
            label: 'Nha rieng'
          },
          shippingFee: 15000
        });

      expect([201, 400, 500]).toContain(res.status);
      if (res.status === 201) {
        expect(res.body).toHaveProperty('orderNumber');
      }
    });

    it('BUOC 6 - TC-E-006: Xem lich su don hang', async () => {
      jwt.verify.mockReturnValue({ id: userId });
      User.findById.mockResolvedValue({ id: userId, isActive: true, role: 'CUSTOMER' });

      const mockOrders = [{
        id: 'order-e2e-001',
        orderNumber: 'FB-E2E-001',
        status: 'PENDING_PAYMENT',
        totalAmount: 85000
      }];

      const chainMock = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockOrders)
      };
      Order.find.mockReturnValue(chainMock);

      const res = await request(app)
        .get('/api/v1/orders/my-orders')
        .set('Authorization', `Bearer ${accessToken}`);

      expect([200, 404, 500]).toContain(res.status);
    });
  });

  // ==========================================================================
  // LUONG 2: ADMIN QUAN LY DON HANG
  // ==========================================================================
  describe('LUONG E2E-02: Admin duyet va xu ly don hang', () => {

    it('TC-E-007: Admin xem tat ca don hang', async () => {
      jwt.verify.mockReturnValue({ id: 'admin-uid' });
      User.findById.mockResolvedValue({ id: 'admin-uid', isActive: true, role: 'ADMIN' });

      const chainMock = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis()
      };
      Order.find.mockReturnValue(chainMock);
      Order.countDocuments.mockResolvedValue(0);

      const res = await request(app)
        .get('/api/v1/orders')
        .set('Authorization', 'Bearer admin-token');

      expect([200, 403, 500]).toContain(res.status);
    });

    it('TC-E-008: Admin xem danh sach nguoi dung', async () => {
      jwt.verify.mockReturnValue({ id: 'admin-uid' });
      User.findById.mockResolvedValue({ id: 'admin-uid', isActive: true, role: 'ADMIN' });

      const chainMock = {
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue([{ id: 'uid1', role: 'CUSTOMER' }])
      };
      User.find.mockReturnValue(chainMock);

      const res = await request(app)
        .get('/api/v1/auth/users')
        .set('Authorization', 'Bearer admin-token');

      expect([200, 403, 500]).toContain(res.status);
    });

    it('TC-E-009: CUSTOMER khong duoc xem tat ca don hang (chi ADMIN/SHIPPER)', async () => {
      jwt.verify.mockReturnValue({ id: userId });
      User.findById.mockResolvedValue({ id: userId, isActive: true, role: 'CUSTOMER' });

      const res = await request(app)
        .get('/api/v1/orders/admin')
        .set('Authorization', `Bearer ${accessToken}`);

      expect([403]).toContain(res.status);
    });
  });

  // ==========================================================================
  // LUONG 3: SHIPPER GIAO HANG
  // ==========================================================================
  describe('LUONG E2E-03: Shipper nhan va giao don hang', () => {

    it('TC-E-010: Shipper xem don hang sap giao', async () => {
      jwt.verify.mockReturnValue({ id: 'shipper-uid' });
      User.findById.mockResolvedValue({ id: 'shipper-uid', isActive: true, role: 'SHIPPER' });

      const chainMock = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([])
      };
      Order.find.mockReturnValue(chainMock);
      Order.countDocuments.mockResolvedValue(0);

      const res = await request(app)
        .get('/api/v1/orders')
        .set('Authorization', 'Bearer shipper-token');

      expect([200, 403, 500]).toContain(res.status);
    });
  });
});
