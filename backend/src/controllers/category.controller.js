const Category = require('../models/Category');
const Product = require('../models/Product');
const { ApiError } = require('../middleware/errorHandler');
const cacheService = require('../services/redis.service');

// Lấy danh sách danh mục (Áp dụng Cache-Aside Pattern giảm 99% tải Database)
const findAll = async (req, res, next) => {
  try {
    const includeInactive = req.query.includeInactive === 'true';
    const cacheKey = includeInactive ? 'categories:all' : 'categories:active';

    const results = await cacheService.cacheAside(cacheKey, 600, async () => {
      const filter = includeInactive ? {} : { isActive: true };
      const categories = await Category.find(filter).sort({ sortOrder: 'asc' });

      return Promise.all(
        categories.map(async (cat) => {
          const productCount = await Product.countDocuments({ categoryId: cat._id });
          const catObj = typeof cat.toJSON === 'function' ? cat.toJSON() : { ...cat };
          catObj._count = { products: productCount };
          return catObj;
        })
      );
    });
    
    res.status(200).json(results);
  } catch (error) {
    next(error);
  }
};

// Lấy chi tiết danh mục theo ID kèm sản phẩm thuộc danh mục
const findOne = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const category = await Category.findById(id);
    if (!category) {
      throw new ApiError(404, `Không tìm thấy danh mục có ID: ${id}`);
    }
    
    // Tìm các sản phẩm thuộc danh mục đang mở bán
    const products = await Product.find({ categoryId: id, isAvailable: true }).sort({ sortOrder: 'asc' });
    
    const resultObj = category.toJSON();
    resultObj.products = products;
    
    res.status(200).json(resultObj);
  } catch (error) {
    next(error);
  }
};

// Lấy chi tiết danh mục theo Slug kèm sản phẩm (Dùng ở trang Menu của frontend)
const findBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;
    
    const category = await Category.findOne({ slug });
    if (!category) {
      throw new ApiError(404, `Không tìm thấy danh mục có đường dẫn tĩnh: ${slug}`);
    }
    
    const products = await Product.find({ categoryId: category._id, isAvailable: true }).sort({ sortOrder: 'asc' });
    
    const resultObj = category.toJSON();
    resultObj.products = products;
    
    res.status(200).json(resultObj);
  } catch (error) {
    next(error);
  }
};

// Tạo danh mục mới (Admin)
const create = async (req, res, next) => {
  try {
    const { name, slug, description, image, sortOrder, isActive } = req.body;
    
    const category = await Category.create({
      name,
      slug,
      description,
      image,
      sortOrder,
      isActive
    });

    await cacheService.invalidatePattern('categories:*');
    
    res.status(201).json(category);
  } catch (error) {
    next(error);
  }
};

// Cập nhật danh mục (Admin)
const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const category = await Category.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true
    });
    
    if (!category) {
      throw new ApiError(404, `Không tìm thấy danh mục có ID: ${id}`);
    }

    await cacheService.invalidatePattern('categories:*');
    
    res.status(200).json(category);
  } catch (error) {
    next(error);
  }
};

// Xóa danh mục (Admin)
const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const category = await Category.findByIdAndDelete(id);
    if (!category) {
      throw new ApiError(404, `Không tìm thấy danh mục có ID: ${id}`);
    }

    await cacheService.invalidatePattern('categories:*');
    
    res.status(200).json({ success: true, message: 'Xóa danh mục thành công.' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  findAll,
  findOne,
  findBySlug,
  create,
  update,
  remove
};
