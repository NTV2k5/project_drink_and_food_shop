/**
 * =============================================================================
 * TANG 1: UNIT TESTS (Source Tests)
 * Muc tieu: Kiem tra tung doan code nho nhat co loi logic hay khong.
 * Khong ket noi DB, mock toan bo dependencies.
 * =============================================================================
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

jest.mock('bcryptjs');
jest.mock('jsonwebtoken');
jest.mock('../../src/models/User');
jest.mock('../../src/models/Order');
jest.mock('../../src/models/Product');
jest.mock('../../src/models/Coupon');

const User = require('../../src/models/User');

const mockReq = (body = {}, params = {}, user = null) => ({
  body, params, user, headers: {}, app: { get: jest.fn() }
});

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mockNext = () => jest.fn();

const {
  register, login, refreshToken, logout, getProfile, updateUserRole
} = require('../../src/controllers/auth.controller');

describe('[TANG 1] Auth Controller - Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_ACCESS_SECRET = 'test-access-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
  });

  describe('register()', () => {
    it('TC-U-001: Phai nem ApiError 400 khi thieu ca email va phone', async () => {
      const req = mockReq({ password: '123456' });
      const res = mockRes();
      const next = mockNext();
      await register(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(400);
    });

    it('TC-U-002: Phai nem ApiError 400 khi email da ton tai', async () => {
      const req = mockReq({ email: 'test@example.com', password: '123456' });
      const res = mockRes();
      const next = mockNext();
      User.findOne.mockResolvedValue({ email: 'test@example.com' });
      await register(req, res, next);
      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(400);
    });

    it('TC-U-003: Phai tao user moi thanh cong va tra ve tokens', async () => {
      const req = mockReq({ email: 'new@example.com', password: 'SecurePass123!', fullName: 'Nguyen Van A' });
      const res = mockRes();
      const next = mockNext();
      User.findOne.mockResolvedValue(null);
      bcrypt.genSalt.mockResolvedValue('salt');
      bcrypt.hash.mockResolvedValue('hashedPassword');
      User.create.mockResolvedValue({ id: 'user-id-123' });
      jwt.sign.mockReturnValueOnce('access-token-xyz').mockReturnValueOnce('refresh-token-xyz');
      await register(req, res, next);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ accessToken: 'access-token-xyz', refreshToken: 'refresh-token-xyz' });
      expect(next).not.toHaveBeenCalled();
    });

    it('TC-U-004: Phai hash password voi bcrypt salt=10 (OWASP Standard)', async () => {
      const req = mockReq({ email: 'hash@test.com', password: 'PlainText123' });
      const res = mockRes();
      const next = mockNext();
      User.findOne.mockResolvedValue(null);
      bcrypt.genSalt.mockResolvedValue('salt10');
      bcrypt.hash.mockResolvedValue('hashed');
      User.create.mockResolvedValue({ id: 'uid' });
      jwt.sign.mockReturnValue('token');
      await register(req, res, next);
      expect(bcrypt.genSalt).toHaveBeenCalledWith(10);
      expect(bcrypt.hash).toHaveBeenCalledWith('PlainText123', 'salt10');
    });
  });

  describe('login()', () => {
    it('TC-U-005: Phai nem ApiError 400 khi thieu ca email va phone', async () => {
      const req = mockReq({ password: 'pass' });
      const res = mockRes();
      const next = mockNext();
      await login(req, res, next);
      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(400);
    });

    it('TC-U-006: Phai nem ApiError 401 khi user khong ton tai', async () => {
      const req = mockReq({ email: 'notfound@example.com', password: '123456' });
      const res = mockRes();
      const next = mockNext();
      User.findOne.mockResolvedValue(null);
      await login(req, res, next);
      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(401);
    });

    it('TC-U-007: Phai nem ApiError 401 khi mat khau sai', async () => {
      const req = mockReq({ email: 'user@example.com', password: 'WrongPass' });
      const res = mockRes();
      const next = mockNext();
      User.findOne.mockResolvedValue({ id: 'uid', passwordHash: 'hash', isActive: true });
      bcrypt.compare.mockResolvedValue(false);
      await login(req, res, next);
      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(401);
    });

    it('TC-U-008: Phai nem ApiError 401 khi tai khoan bi khoa', async () => {
      const req = mockReq({ email: 'locked@example.com', password: 'pass' });
      const res = mockRes();
      const next = mockNext();
      User.findOne.mockResolvedValue({ id: 'uid', passwordHash: 'hash', isActive: false });
      bcrypt.compare.mockResolvedValue(true);
      await login(req, res, next);
      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(401);
    });

    it('TC-U-009: Dang nhap thanh cong phai tra ve accessToken va refreshToken', async () => {
      const req = mockReq({ email: 'user@example.com', password: 'CorrectPass' });
      const res = mockRes();
      const next = mockNext();
      User.findOne.mockResolvedValue({ id: 'uid-456', passwordHash: 'hash', isActive: true });
      bcrypt.compare.mockResolvedValue(true);
      jwt.sign.mockReturnValueOnce('new-access-token').mockReturnValueOnce('new-refresh-token');
      await login(req, res, next);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ accessToken: 'new-access-token', refreshToken: 'new-refresh-token' });
    });
  });

  describe('refreshToken()', () => {
    it('TC-U-010: Phai nem 401 khi khong co refresh token', async () => {
      const req = mockReq({});
      const res = mockRes();
      const next = mockNext();
      await refreshToken(req, res, next);
      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(401);
    });

    it('TC-U-011: Phai nem 401 khi refresh token khong hop le', async () => {
      const req = mockReq({ refreshToken: 'invalid-token' });
      const res = mockRes();
      const next = mockNext();
      jwt.verify.mockImplementation(() => { throw new Error('invalid signature'); });
      await refreshToken(req, res, next);
      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(401);
    });

    it('TC-U-012: Phai tra ve access token moi khi refresh token hop le', async () => {
      const req = mockReq({ refreshToken: 'valid-refresh-token' });
      const res = mockRes();
      const next = mockNext();
      jwt.verify.mockReturnValue({ id: 'user-id-789' });
      User.findById.mockResolvedValue({ id: 'user-id-789', isActive: true });
      jwt.sign.mockReturnValue('brand-new-access-token');
      await refreshToken(req, res, next);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ accessToken: 'brand-new-access-token' });
    });
  });

  describe('getProfile()', () => {
    it('TC-U-013: Phai tra 404 neu user khong ton tai', async () => {
      const req = mockReq({}, {}, { id: 'nonexistent-id' });
      const res = mockRes();
      const next = mockNext();
      const selectMock = jest.fn().mockResolvedValue(null);
      User.findById.mockReturnValue({ select: selectMock });
      await getProfile(req, res, next);
      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(404);
    });

    it('TC-U-014: Phai tra ve profile khi user ton tai', async () => {
      const userProfile = { id: 'uid-111', email: 'test@example.com', fullName: 'Test User', role: 'CUSTOMER' };
      const req = mockReq({}, {}, { id: 'uid-111' });
      const res = mockRes();
      const next = mockNext();
      const selectMock = jest.fn().mockResolvedValue(userProfile);
      User.findById.mockReturnValue({ select: selectMock });
      await getProfile(req, res, next);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(userProfile);
    });
  });

  describe('updateUserRole()', () => {
    it('TC-U-015: Phai nem 400 neu role khong hop le', async () => {
      const req = mockReq({ role: 'SUPERADMIN' }, { id: 'uid' });
      const res = mockRes();
      const next = mockNext();
      await updateUserRole(req, res, next);
      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(400);
    });

    it('TC-U-016: Phai cap nhat role CUSTOMER/SHIPPER/ADMIN thanh cong', async () => {
      for (const role of ['CUSTOMER', 'SHIPPER', 'ADMIN']) {
        jest.clearAllMocks();
        const req = mockReq({ role }, { id: 'uid-test' });
        const res = mockRes();
        const next = mockNext();
        const selectMock = jest.fn().mockResolvedValue({ id: 'uid-test', role });
        User.findByIdAndUpdate.mockReturnValue({ select: selectMock });
        await updateUserRole(req, res, next);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(next).not.toHaveBeenCalled();
      }
    });
  });

  describe('logout()', () => {
    it('TC-U-017: Phai tra ve thong bao dang xuat thanh cong', async () => {
      const req = mockReq();
      const res = mockRes();
      const next = mockNext();
      await logout(req, res, next);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.any(String) }));
    });
  });
});
