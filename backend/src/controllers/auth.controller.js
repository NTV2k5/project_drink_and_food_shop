const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { ApiError } = require('../middleware/errorHandler');

// Tạo Access Token và Refresh Token
const generateTokens = (userId) => {
  const accessToken = jwt.sign(
    { id: userId, sub: userId },
    process.env.JWT_ACCESS_SECRET || 'change-me-in-production-access',
    { expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m' }
  );

  const refreshToken = jwt.sign(
    { id: userId, sub: userId },
    process.env.JWT_REFRESH_SECRET || 'change-me-in-production-refresh',
    { expiresIn: process.env.JWT_REFRESH_EXPIRES || '7d' }
  );

  return { accessToken, refreshToken };
};

// Đăng ký tài khoản mới
const register = async (req, res, next) => {
  try {
    const { email, phone, password, fullName } = req.body;

    if (!email && !phone) {
      throw new ApiError(400, 'Cần cung cấp Email hoặc Số điện thoại để đăng ký.');
    }

    // Kiểm tra xem user đã tồn tại chưa
    const query = [];
    if (email) query.push({ email });
    if (phone) query.push({ phone });

    const existingUser = await User.findOne({ $or: query });
    if (existingUser) {
      throw new ApiError(400, 'Tài khoản Email hoặc Số điện thoại đã tồn tại.');
    }

    // Mã hóa mật khẩu (OWASP Standard work factor 10, cân bằng bảo mật và giải phóng CPU threadpool)
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Tạo người dùng mới
    const user = await User.create({
      email,
      phone,
      passwordHash: hashedPassword,
      fullName
    });

    const tokens = generateTokens(user.id);
    res.status(201).json(tokens);
  } catch (error) {
    next(error);
  }
};

// Đăng nhập
const login = async (req, res, next) => {
  try {
    const { email, phone, password } = req.body;

    if (!email && !phone) {
      throw new ApiError(400, 'Vui lòng điền Email hoặc Số điện thoại để đăng nhập.');
    }

    // Tìm người dùng
    const query = {};
    if (email) query.email = email;
    else if (phone) query.phone = phone;

    const user = await User.findOne(query);
    if (!user || !user.passwordHash) {
      throw new ApiError(401, 'Thông tin đăng nhập không chính xác.');
    }

    // So sánh mật khẩu
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new ApiError(401, 'Thông tin đăng nhập không chính xác.');
    }

    if (!user.isActive) {
      throw new ApiError(401, 'Tài khoản hiện đang bị khóa.');
    }

    const tokens = generateTokens(user.id);
    res.status(200).json(tokens);
  } catch (error) {
    next(error);
  }
};

// Lấy thông tin tài khoản hiện tại
const getProfile = async (req, res, next) => {
  try {
    // req.user được gán từ requireAuth middleware
    const user = await User.findById(req.user.id).select(
      'id email phone fullName role loyaltyPoints loyaltyTier isActive'
    );
    if (!user) {
      throw new ApiError(404, 'Không tìm thấy thông tin tài khoản.');
    }
    res.status(200).json(user);
  } catch (error) {
    next(error);
  }
};

// Lấy danh sách tất cả người dùng (Admin)
const getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find()
      .select('id email phone fullName role loyaltyPoints loyaltyTier isActive')
      .sort({ role: 'asc' });
      
    res.status(200).json(users);
  } catch (error) {
    next(error);
  }
};

// Cập nhật vai trò người dùng (Admin)
const updateUserRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['CUSTOMER', 'SHIPPER', 'ADMIN'].includes(role)) {
      throw new ApiError(400, 'Vai trò không hợp lệ.');
    }

    const user = await User.findByIdAndUpdate(
      id,
      { role },
      { new: true, runValidators: true }
    ).select('id email fullName role');

    if (!user) {
      throw new ApiError(404, 'Không tìm thấy tài khoản người dùng.');
    }

    res.status(200).json(user);
  } catch (error) {
    next(error);
  }
};

// Làm mới Access Token bằng Refresh Token
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken: token } = req.body;
    if (!token) {
      throw new ApiError(401, 'Refresh token không được cung cấp.');
    }

    // Xác minh refresh token
    let decoded;
    try {
      decoded = jwt.verify(
        token,
        process.env.JWT_REFRESH_SECRET || 'change-me-in-production-refresh'
      );
    } catch {
      throw new ApiError(401, 'Refresh token không hợp lệ hoặc đã hết hạn.');
    }

    // Kiểm tra user vẫn tồn tại và active
    const user = await User.findById(decoded.id || decoded.userId);
    if (!user || !user.isActive) {
      throw new ApiError(401, 'Tài khoản không tồn tại hoặc đã bị khóa.');
    }

    // Tạo access token mới
    const newAccessToken = jwt.sign(
      { id: user.id, sub: user.id },
      process.env.JWT_ACCESS_SECRET || 'change-me-in-production-access',
      { expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m' }
    );

    res.status(200).json({ accessToken: newAccessToken });
  } catch (error) {
    next(error);
  }
};

// Đăng xuất (client-side token invalidation)
const logout = async (req, res, next) => {
  try {
    // Với JWT stateless, logout được xử lý phía client bằng cách xóa token.
    // Để blacklist token phía server, cần Redis (có thể implement sau).
    res.status(200).json({ message: 'Đăng xuất thành công. Vui lòng xóa token khỏi client.' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  refreshToken,
  logout,
  getProfile,
  getAllUsers,
  updateUserRole
};
