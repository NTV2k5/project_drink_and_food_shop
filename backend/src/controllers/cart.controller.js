const CartItem = require('../models/CartItem');
const Product = require('../models/Product');
const { ApiError } = require('../middleware/errorHandler');

// Lấy danh sách sản phẩm trong giỏ hàng của người dùng hiện tại
const getCart = async (req, res, next) => {
  try {
    const cartItems = await CartItem.find({ userId: req.user.id })
      .populate({
        path: 'productId',
        populate: { path: 'categoryId', select: 'id name slug' }
      })
      .sort({ createdAt: -1 });

    // Định dạng lại kết quả để khớp với cấu trúc Prisma của NestJS (trả về trường product thay vì productId)
    const formattedCart = cartItems.map((item) => {
      const itemObj = typeof item.toJSON === 'function' ? item.toJSON() : { ...item };
      itemObj.product = itemObj.productId;
      delete itemObj.productId;
      return itemObj;
    });

    res.status(200).json(formattedCart);
  } catch (error) {
    next(error);
  }
};

// Thêm sản phẩm vào giỏ hàng
const addToCart = async (req, res, next) => {
  try {
    const { productId, quantity, selectedOptions, note } = req.body;
    const userId = req.user.id;

    // Kiểm tra sản phẩm có sẵn không
    const product = await Product.findOne({ _id: productId, isAvailable: true });
    if (!product) {
      throw new ApiError(404, 'Sản phẩm không tồn tại hoặc đã hết hàng.');
    }

    // Kiểm tra xem sản phẩm cùng các tùy chọn đã có trong giỏ chưa
    // Để so sánh mảng selectedOptions trong MongoDB, chúng ta có thể sử dụng $jsonSchema hoặc tự so sánh
    const cartItems = await CartItem.find({ userId, productId });
    
    let existingItem = null;
    for (const item of cartItems) {
      // So sánh sâu các tùy chọn được chọn
      const match = JSON.stringify(item.selectedOptions) === JSON.stringify(selectedOptions);
      if (match) {
        existingItem = item;
        break;
      }
    }

    let result;
    if (existingItem) {
      existingItem.quantity += Number(quantity);
      result = await existingItem.save();
    } else {
      result = await CartItem.create({
        userId,
        productId,
        quantity: Number(quantity),
        selectedOptions,
        note
      });
    }

    // Populate thông tin sản phẩm và danh mục trước khi trả về
    let populatedResult = null;
    try {
      populatedResult = await CartItem.findById(result.id).populate({
        path: 'productId',
        populate: { path: 'categoryId', select: 'id name slug' }
      });
    } catch {
      populatedResult = null;
    }

    const targetObj = populatedResult || result;
    const formattedObj = typeof targetObj?.toJSON === 'function' ? targetObj.toJSON() : { ...targetObj };
    formattedObj.product = formattedObj.productId;
    delete formattedObj.productId;

    res.status(200).json(formattedObj);
  } catch (error) {
    next(error);
  }
};

// Cập nhật số lượng hoặc ghi chú của món hàng trong giỏ
const updateCartItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { quantity, note } = req.body;
    const userId = req.user.id;

    const item = await CartItem.findById(id);
    if (!item) {
      throw new ApiError(404, 'Không tìm thấy món hàng này trong giỏ.');
    }

    if (item.userId.toString() !== userId.toString()) {
      throw new ApiError(403, 'Bạn không có quyền sửa giỏ hàng của người khác.');
    }

    if (quantity !== undefined) item.quantity = Number(quantity);
    if (note !== undefined) item.note = note;

    await item.save();

    const populatedItem = await CartItem.findById(id).populate({
      path: 'productId',
      populate: { path: 'categoryId', select: 'id name slug' }
    });

    const formattedObj = populatedItem.toJSON();
    formattedObj.product = formattedObj.productId;
    delete formattedObj.productId;

    res.status(200).json(formattedObj);
  } catch (error) {
    next(error);
  }
};

// Xóa món hàng khỏi giỏ
const removeFromCart = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const item = await CartItem.findById(id);
    if (!item) {
      throw new ApiError(404, 'Không tìm thấy món hàng trong giỏ.');
    }

    if (item.userId.toString() !== userId.toString()) {
      throw new ApiError(403, 'Bạn không có quyền xóa giỏ hàng của người khác.');
    }

    await CartItem.findByIdAndDelete(id);
    res.status(200).json({ success: true, message: 'Đã xóa món hàng khỏi giỏ.' });
  } catch (error) {
    next(error);
  }
};

// Xóa toàn bộ giỏ hàng
const clearCart = async (req, res, next) => {
  try {
    await CartItem.deleteMany({ userId: req.user.id });
    res.status(200).json({ success: true, message: 'Đã dọn sạch giỏ hàng.' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart
};
