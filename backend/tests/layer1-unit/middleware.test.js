/**
 * =============================================================================
 * TANG 1: UNIT TESTS - Middleware (Auth, ErrorHandler, Validation)
 * Kiem tra cac middleware doc lap khong qua HTTP
 * =============================================================================
 */

jest.mock('jsonwebtoken');
jest.mock('../../src/models/User');

const jwt = require('jsonwebtoken');
const User = require('../../src/models/User');
const { requireAuth, restrictTo } = require('../../src/middleware/auth');
const { ApiError, errorHandler } = require('../../src/middleware/errorHandler');

const mockReq = (headers = {}, user = null) => ({
  headers,
  user,
  method: 'GET',
  originalUrl: '/api/v1/test'
});

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mockNext = () => jest.fn();

// =============================================================================
describe('[TANG 1] Middleware - Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_ACCESS_SECRET = 'test-secret';
  });

  // ─── requireAuth middleware ────────────────────────────────────────────────
  describe('requireAuth()', () => {
    it('TC-M-001: Phai nem 401 khi khong co Authorization header', async () => {
      const req = mockReq({});
      const res = mockRes();
      const next = mockNext();

      await requireAuth(req, res, next);

      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(401);
    });

    it('TC-M-002: Phai nem 401 khi header khong bat dau bang Bearer', async () => {
      const req = mockReq({ authorization: 'Basic some-token' });
      const res = mockRes();
      const next = mockNext();

      await requireAuth(req, res, next);

      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(401);
    });

    it('TC-M-003: Phai nem 401 khi JWT verify that bai', async () => {
      const req = mockReq({ authorization: 'Bearer invalid.jwt.token' });
      const res = mockRes();
      const next = mockNext();

      jwt.verify.mockImplementation(() => { throw new Error('jwt malformed'); });

      await requireAuth(req, res, next);

      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(401);
    });

    it('TC-M-004: Phai nem 401 khi user bi xoa khoi DB', async () => {
      const req = mockReq({ authorization: 'Bearer valid.jwt.token' });
      const res = mockRes();
      const next = mockNext();

      jwt.verify.mockReturnValue({ id: 'deleted-user-id' });
      User.findById.mockResolvedValue(null);

      await requireAuth(req, res, next);

      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(401);
    });

    it('TC-M-005: Phai nem 401 khi tai khoan bi khoa (isActive=false)', async () => {
      const req = mockReq({ authorization: 'Bearer valid.token' });
      const res = mockRes();
      const next = mockNext();

      jwt.verify.mockReturnValue({ id: 'uid' });
      User.findById.mockResolvedValue({ id: 'uid', isActive: false });

      await requireAuth(req, res, next);

      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(401);
    });

    it('TC-M-006: Phai gan req.user va goi next() khi token hop le', async () => {
      const req = mockReq({ authorization: 'Bearer valid.token' });
      const res = mockRes();
      const next = mockNext();

      const mockUser = { id: 'active-uid', isActive: true, role: 'CUSTOMER' };
      jwt.verify.mockReturnValue({ id: 'active-uid' });
      User.findById.mockResolvedValue(mockUser);

      await requireAuth(req, res, next);

      expect(req.user).toEqual(mockUser);
      expect(next).toHaveBeenCalledWith();
    });
  });

  // ─── restrictTo middleware ─────────────────────────────────────────────────
  describe('restrictTo()', () => {
    it('TC-M-007: ADMIN duoc phep khi restrict["ADMIN"]', () => {
      const req = mockReq({}, { role: 'ADMIN' });
      const res = mockRes();
      const next = mockNext();

      restrictTo('ADMIN')(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('TC-M-008: CUSTOMER bi tu choi khi chi cho phep ADMIN', () => {
      const req = mockReq({}, { role: 'CUSTOMER' });
      const res = mockRes();
      const next = mockNext();

      restrictTo('ADMIN')(req, res, next);

      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(403);
    });

    it('TC-M-009: Nhieu roles: ADMIN va SHIPPER duoc phep', () => {
      for (const role of ['ADMIN', 'SHIPPER']) {
        const req = mockReq({}, { role });
        const res = mockRes();
        const next = mockNext();
        restrictTo('ADMIN', 'SHIPPER')(req, res, next);
        expect(next).toHaveBeenCalledWith();
      }
    });

    it('TC-M-010: Khong co req.user phai nem 403', () => {
      const req = mockReq({}, null);
      const res = mockRes();
      const next = mockNext();

      restrictTo('ADMIN')(req, res, next);

      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(403);
    });
  });

  // ─── ApiError class ────────────────────────────────────────────────────────
  describe('ApiError class', () => {
    it('TC-M-011: ApiError 4xx co status = fail', () => {
      const err = new ApiError(400, 'Bad Request');
      expect(err.statusCode).toBe(400);
      expect(err.status).toBe('fail');
      expect(err.isOperational).toBe(true);
      expect(err.message).toBe('Bad Request');
    });

    it('TC-M-012: ApiError 5xx co status = error', () => {
      const err = new ApiError(500, 'Internal Error');
      expect(err.status).toBe('error');
    });

    it('TC-M-013: ApiError la instance cua Error', () => {
      const err = new ApiError(404, 'Not Found');
      expect(err instanceof Error).toBe(true);
    });
  });

  // ─── errorHandler middleware ───────────────────────────────────────────────
  describe('errorHandler()', () => {
    it('TC-M-014: Phai xu ly Mongoose Duplicate Key Error (code 11000)', () => {
      const err = { code: 11000, keyValue: { email: 'dup@test.com' } };
      const req = mockReq();
      const res = mockRes();
      const next = mockNext();

      errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    });

    it('TC-M-015: Phai xu ly Mongoose ValidationError', () => {
      const err = {
        name: 'ValidationError',
        errors: {
          email: { message: 'Email khong hop le' }
        }
      };
      const req = mockReq();
      const res = mockRes();
      const next = mockNext();

      errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('TC-M-016: Phai xu ly Mongoose CastError (ID khong hop le)', () => {
      const err = { name: 'CastError', value: 'invalid-id-xyz' };
      const req = mockReq();
      const res = mockRes();
      const next = mockNext();

      errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('TC-M-017: Phai xu ly ApiError voi dung statusCode', () => {
      const err = new ApiError(404, 'Not Found Resource');
      const req = mockReq();
      const res = mockRes();
      const next = mockNext();

      errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: 'Not Found Resource' })
      );
    });

    it('TC-M-018: Loi khong xac dinh phai tra ve 500', () => {
      const err = new Error('Unknown error');
      const req = mockReq();
      const res = mockRes();
      const next = mockNext();

      errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
