const mongoose = require('mongoose');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Order = require('../models/Order');
const Review = require('../models/Review');
const { ApiError } = require('../middleware/errorHandler');

// Lấy danh sách sản phẩm có phân trang, tìm kiếm, lọc
const findAll = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const filter = { isAvailable: true };

    // Lọc theo Category ID hoặc Category Slug
    if (req.query.categoryId) {
      filter.categoryId = req.query.categoryId;
    } else if (req.query.category) {
      const category = await Category.findOne({ slug: req.query.category });
      if (category) {
        filter.categoryId = category._id;
      } else {
        return res.status(200).json({
          items: [],
          meta: { total: 0, page, limit, totalPages: 0 }
        });
      }
    }

    // Lọc theo sản phẩm nổi bật
    if (req.query.featured === 'true' || req.query.featured === true) {
      filter.isFeatured = true;
    }

    // Lọc theo khoảng giá
    if (req.query.minPrice !== undefined || req.query.maxPrice !== undefined) {
      filter.basePrice = {};
      if (req.query.minPrice !== undefined) {
        filter.basePrice.$gte = parseFloat(req.query.minPrice);
      }
      if (req.query.maxPrice !== undefined) {
        filter.basePrice.$lte = parseFloat(req.query.maxPrice);
      }
    }

    // Tìm kiếm theo tên hoặc mô tả
    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { description: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    // Sắp xếp
    let sortOptions = { sortOrder: 'asc' };
    if (req.query.sort === 'price_asc') {
      sortOptions = { basePrice: 'asc' };
    } else if (req.query.sort === 'price_desc') {
      sortOptions = { basePrice: 'desc' };
    } else if (req.query.sort === 'newest') {
      sortOptions = { createdAt: 'desc' };
    }

    let query = Product.find(filter);
    if (query && typeof query.sort === 'function') query = query.sort(sortOptions);
    if (query && typeof query.skip === 'function') query = query.skip(skip);
    if (query && typeof query.limit === 'function') query = query.limit(limit);
    if (query && typeof query.populate === 'function') query = query.populate('categoryId', 'id name slug');

    const countPromise = typeof Product.countDocuments === 'function'
      ? Product.countDocuments(filter)
      : Promise.resolve(0);

    const [products, total] = await Promise.all([
      query,
      countPromise
    ]);

    // Trả về cấu hình giống NestJS: { items: [], meta: { total, page, limit, totalPages } }
    res.status(200).json({
      items: products,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

// Lấy sản phẩm bán chạy nhất
const findBestsellers = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 8;

    // Aggregate từ Order để tìm sản phẩm được đặt nhiều nhất
    const popular = await Order.aggregate([
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          totalQty: { $sum: '$items.quantity' }
        }
      },
      { $sort: { totalQty: -1 } },
      { $limit: limit }
    ]);

    const popularIds = popular.map((p) => p._id);
    
    // Tìm chi tiết các sản phẩm này
    let products = await Product.find({
      _id: { $in: popularIds },
      isAvailable: true
    }).populate('categoryId', 'id name slug');

    // Nếu không đủ số lượng bán chạy từ hóa đơn, bổ sung bằng sản phẩm nổi bật/mới
    if (products.length < limit) {
      const extraProducts = await Product.find({
        _id: { $nin: popularIds },
        isAvailable: true
      })
        .limit(limit - products.length)
        .populate('categoryId', 'id name slug');
      
      products = [...products, ...extraProducts];
    }

    res.status(200).json(products);
  } catch (error) {
    next(error);
  }
};

// Lấy chi tiết sản phẩm theo Slug
const findBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const product = await Product.findOne({ slug }).populate('categoryId', 'id name slug');
    
    if (!product) {
      throw new ApiError(404, `Không tìm thấy sản phẩm với slug: ${slug}`);
    }
    
    res.status(200).json(product);
  } catch (error) {
    next(error);
  }
};

// Lấy chi tiết sản phẩm theo ID
const findOne = async (req, res, next) => {
  try {
    const { id } = req.params;
    let query = Product.findById(id);
    if (query && typeof query.populate === 'function') {
      query = query.populate('categoryId', 'id name slug');
    }
    const product = await query;
    
    if (!product) {
      throw new ApiError(404, `Không tìm thấy sản phẩm với ID: ${id}`);
    }
    
    res.status(200).json(product);
  } catch (error) {
    next(error);
  }
};

// Lấy danh sách đánh giá của sản phẩm
const getProductReviews = async (req, res, next) => {
  try {
    const { id: productId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(200).json([]);
    }
    const reviews = await Review.find({ productId })
      .populate('userId', 'id fullName email')
      .sort({ createdAt: -1 });
    
    res.status(200).json(reviews);
  } catch (error) {
    next(error);
  }
};

// Tạo sản phẩm mới (Admin)
const create = async (req, res, next) => {
  try {
    const {
      name,
      slug,
      description,
      basePrice,
      image,
      images,
      categoryId,
      isAvailable,
      isFeatured,
      sortOrder,
      optionGroups
    } = req.body;

    const product = await Product.create({
      name,
      slug,
      description,
      basePrice,
      image,
      images,
      categoryId,
      isAvailable,
      isFeatured,
      sortOrder,
      optionGroups
    });

    res.status(201).json(product);
  } catch (error) {
    next(error);
  }
};

// Cập nhật sản phẩm (Admin)
const update = async (req, res, next) => {
  try {
    const { id } = req.params;

    const product = await Product.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true
    }).populate('categoryId', 'id name slug');

    if (!product) {
      throw new ApiError(404, `Không tìm thấy sản phẩm với ID: ${id}`);
    }

    res.status(200).json(product);
  } catch (error) {
    next(error);
  }
};

// Bật/tắt trạng thái còn hàng (Admin)
const toggleAvailability = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isAvailable } = req.body;

    const product = await Product.findByIdAndUpdate(
      id,
      { isAvailable },
      { new: true }
    );

    if (!product) {
      throw new ApiError(404, `Không tìm thấy sản phẩm với ID: ${id}`);
    }

    res.status(200).json(product);
  } catch (error) {
    next(error);
  }
};

// Xóa sản phẩm (Admin)
const remove = async (req, res, next) => {
  try {
    const { id } = req.params;

    const product = await Product.findByIdAndDelete(id);
    if (!product) {
      throw new ApiError(404, `Không tìm thấy sản phẩm với ID: ${id}`);
    }

    res.status(200).json({ success: true, message: 'Xóa sản phẩm thành công.' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  findAll,
  findBestsellers,
  findBySlug,
  findOne,
  getProductReviews,
  create,
  update,
  toggleAvailability,
  remove
};
