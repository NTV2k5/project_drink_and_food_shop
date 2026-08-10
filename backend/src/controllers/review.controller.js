const Review = require('../models/Review');
const Product = require('../models/Product');
const Order = require('../models/Order');
const { ApiError } = require('../middleware/errorHandler');

/**
 * Lấy danh sách tất cả reviews (Admin)
 * GET /api/v1/reviews
 */
const findAll = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.productId) filter.productId = req.query.productId;
    if (req.query.rating) filter.rating = parseInt(req.query.rating, 10);

    const [reviews, total] = await Promise.all([
      Review.find(filter)
        .populate('userId', 'id fullName email')
        .populate('productId', 'id name slug')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Review.countDocuments(filter)
    ]);

    res.status(200).json({
      items: reviews,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Tạo đánh giá sản phẩm (yêu cầu đã mua hàng)
 * POST /api/v1/reviews
 */
const create = async (req, res, next) => {
  try {
    const { productId, rating, comment } = req.body;
    const userId = req.user.id;

    // Kiểm tra sản phẩm tồn tại
    const product = await Product.findById(productId);
    if (!product) {
      throw new ApiError(404, 'Không tìm thấy sản phẩm.');
    }

    // Kiểm tra user đã mua sản phẩm này chưa
    const hasPurchased = await Order.exists({
      userId,
      'items.productId': productId,
      status: { $in: ['DELIVERED', 'COMPLETED'] }
    });
    if (!hasPurchased) {
      throw new ApiError(403, 'Bạn chỉ có thể đánh giá sản phẩm sau khi đã mua và nhận hàng.');
    }

    // Kiểm tra user đã đánh giá sản phẩm này chưa
    const existingReview = await Review.findOne({ userId, productId });
    if (existingReview) {
      throw new ApiError(409, 'Bạn đã đánh giá sản phẩm này rồi.');
    }

    const review = await Review.create({ userId, productId, rating, comment });
    const populated = await review.populate('userId', 'id fullName email');

    res.status(201).json(populated);
  } catch (error) {
    next(error);
  }
};

/**
 * Xóa đánh giá (Admin hoặc chính chủ)
 * DELETE /api/v1/reviews/:id
 */
const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const review = await Review.findById(id);

    if (!review) {
      throw new ApiError(404, 'Không tìm thấy đánh giá.');
    }

    // Chỉ admin hoặc chính chủ mới được xóa
    if (
      req.user.role !== 'ADMIN' &&
      review.userId.toString() !== req.user.id.toString()
    ) {
      throw new ApiError(403, 'Bạn không có quyền xóa đánh giá này.');
    }

    await Review.findByIdAndDelete(id);
    res.status(200).json({ success: true, message: 'Xóa đánh giá thành công.' });
  } catch (error) {
    next(error);
  }
};

module.exports = { findAll, create, remove };
