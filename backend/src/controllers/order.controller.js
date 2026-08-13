const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const Coupon = require('../models/Coupon');
const Review = require('../models/Review');
const CartItem = require('../models/CartItem');
const { ApiError } = require('../middleware/errorHandler');
const { geocodeAddress } = require('../services/geocoding');

// Hàm sinh QR Code VietQR để thanh toán ngân hàng tự động qua SePay
const generateSePayPayment = (order) => {
  const bankCode = process.env.SEPAY_BANK_CODE || '970422';
  const accountNo = process.env.SEPAY_ACCOUNT_NO || '0123456789';
  const accountName = process.env.SEPAY_ACCOUNT_NAME || 'FB SHOP';

  const qrContent = `bankCode=${bankCode}&accountNo=${accountNo}&accountName=${encodeURIComponent(accountName)}&amount=${order.totalAmount}&description=${order.orderNumber}`;
  const qrUrl = `https://img.vietqr.io/image/${bankCode}-${accountNo}-compact2.png?amount=${order.totalAmount}&addInfo=${order.orderNumber}&accountName=${encodeURIComponent(accountName)}`;

  return {
    qrUrl,
    qrContent,
    bankCode,
    accountNo,
    accountName,
    transactionCode: order.orderNumber,
    amount: order.totalAmount,
    expiryMinutes: 10
  };
};

// Phát tín hiệu Socket.IO thời gian thực
const emitSocketEvent = (req, room, eventName, payload) => {
  const io = req.app.get('io');
  if (io) {
    if (room) {
      io.to(room).emit(eventName, payload);
    } else {
      io.emit(eventName, payload);
    }
  }
};

// Tạo đơn hàng mới
const createOrder = async (req, res, next) => {
  try {
    const {
      items,
      paymentMethod,
      deliveryAddress,
      shippingFee,
      couponCode,
      pointsUsed,
      requestInvoice,
      note
    } = req.body;
    
    const userId = req.user.id;
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, 'Người dùng không tồn tại.');
    }

    // 1. Tính toán điểm tích lũy sử dụng (1 điểm = 1000 VNĐ)
    let pointsDiscount = 0;
    const numPointsUsed = Number(pointsUsed) || 0;
    if (numPointsUsed > 0) {
      if (user.loyaltyPoints < numPointsUsed) {
        throw new ApiError(400, 'Số điểm tích lũy của bạn không đủ để thanh toán.');
      }
      pointsDiscount = numPointsUsed * 1000;
    }

    // 2. Kiểm tra Coupon giảm giá
    let discountAmount = 0;
    let coupon = null;
    if (couponCode) {
      coupon = await Coupon.findOne({ code: couponCode.toUpperCase(), isActive: true });
      if (!coupon) {
        throw new ApiError(400, 'Mã giảm giá không hợp lệ hoặc đã hết hạn.');
      }
      if (coupon.maxUsage && coupon.usedCount >= coupon.maxUsage) {
        throw new ApiError(400, 'Mã giảm giá đã đạt số lần sử dụng tối đa.');
      }
      if (coupon.expiresAt && new Date() > coupon.expiresAt) {
        throw new ApiError(400, 'Mã giảm giá đã hết hạn.');
      }
    }

    // 3. Tính tiền sản phẩm & kiểm tra tính khả dụng
    const productIds = items.map((i) => i.productId);

    // Kiểm tra định dạng ObjectId của sản phẩm tránh lỗi CastError (VD: khi giỏ hàng chứa CUID từ db cũ)
    const invalidIds = productIds.filter(id => !mongoose.Types.ObjectId.isValid(id));
    if (invalidIds.length > 0) {
      throw new ApiError(400, 'Giỏ hàng của bạn chứa sản phẩm cũ không hợp lệ từ phiên bản trước. Vui lòng xóa/làm mới giỏ hàng và thêm lại món mới từ Menu.');
    }

    const products = await Product.find({ _id: { $in: productIds }, isAvailable: true });
    
    if (products.length !== items.length) {
      throw new ApiError(400, 'Một số sản phẩm trong giỏ hàng hiện không khả dụng.');
    }

    let subtotal = 0;
    const orderItems = items.map((item) => {
      const product = products.find((p) => p.id === item.productId);
      let itemPrice = product.basePrice;

      // Cộng thêm giá extra từ tùy chọn (Size, Topping...) và đảm bảo optionName được lưu
      const resolvedOptions = [];
      if (item.selectedOptions && item.selectedOptions.length > 0) {
        item.selectedOptions.forEach((selected) => {
          const group = product.optionGroups.find((g) => g.id === selected.groupId || g._id.toString() === selected.groupId);
          const option = group?.options.find((o) => o.id === selected.optionId || o._id.toString() === selected.optionId);
          if (option) {
            itemPrice += option.extraPrice;
          }
          // Lưu optionName từ product nếu client không gửi lên
          resolvedOptions.push({
            groupId: selected.groupId,
            optionId: selected.optionId,
            optionName: selected.optionName || option?.name || '',
            extraPrice: selected.extraPrice ?? option?.extraPrice ?? 0
          });
        });
      }

      const itemTotal = itemPrice * item.quantity;
      subtotal += itemTotal;

      return {
        productId: product._id,
        productName: product.name,
        quantity: item.quantity,
        unitPrice: itemPrice,
        selectedOptions: resolvedOptions,
        note: item.note || null,
        subtotal: itemTotal
      };
    });

    // 4. Tính toán số tiền được giảm từ Coupon
    if (coupon) {
      if (coupon.type === 'PERCENT') {
        discountAmount = subtotal * (coupon.value / 100);
      } else {
        discountAmount = coupon.value;
      }
    }

    // Tổng tiền thanh toán (Không được âm)
    const totalAmount = Math.max(0, subtotal + Number(shippingFee) - discountAmount - pointsDiscount);
    const orderNumber = `DH${Date.now().toString().slice(-8)}`;
    
    // Đơn COD được chuyển xác nhận ngay, đơn SEPAY chuyển Chờ thanh toán
    const initialStatus = paymentMethod === 'COD' ? 'CONFIRMED' : 'PENDING_PAYMENT';

    // Tự động định vị từ địa chỉ của khách hàng nếu dùng tọa độ mẫu hoặc trống
    let finalLat = deliveryAddress.lat || 10.762622;
    let finalLng = deliveryAddress.lng || 106.660172;

    if (finalLat === 10.762622 && finalLng === 106.660172) {
      console.log(`[GEOCODING ORDER] Đang định vị địa chỉ giao hàng: "${deliveryAddress.fullAddress}"...`);
      const coords = await geocodeAddress(deliveryAddress.fullAddress);
      if (coords) {
        finalLat = coords.lat;
        finalLng = coords.lng;
        console.log(`[GEOCODING ORDER] Định vị thành công: lat=${finalLat}, lng=${finalLng}`);
      } else {
        console.warn(`[GEOCODING ORDER] Định vị thất bại, dùng tọa độ mặc định.`);
      }
    }

    // Tạo Order
    const order = await Order.create({
      orderNumber,
      userId: user._id,
      status: initialStatus,
      subtotal,
      shippingFee: Number(shippingFee),
      discountAmount,
      totalAmount,
      paymentMethod,
      paymentStatus: 'PENDING',
      couponId: coupon ? coupon._id : null,
      deliveryAddress: {
        ...deliveryAddress,
        lat: finalLat,
        lng: finalLng
      },
      deliveryLat: finalLat,
      deliveryLng: finalLng,
      note,
      pointsUsed: numPointsUsed,
      pointsDiscount,
      requestInvoice: requestInvoice || false,
      items: orderItems,
      statusLogs: [
        {
          status: initialStatus,
          note: paymentMethod === 'COD' ? 'Đơn COD - Xác nhận tự động' : 'Chờ thanh toán qua VietQR'
        }
      ]
    });

    // Trừ điểm tích lũy của khách hàng
    if (numPointsUsed > 0) {
      user.loyaltyPoints -= numPointsUsed;
      await user.save();
    }

    // Cộng số lần dùng của Coupon
    if (coupon) {
      coupon.usedCount += 1;
      await coupon.save();
    }

    // Dọn sạch giỏ hàng của user sau khi đặt hàng
    await CartItem.deleteMany({ userId: user._id });

    // Lấy thông tin đầy đủ để phản hồi
    const populatedOrder = await Order.findById(order._id)
      .populate('userId', 'id fullName email phone')
      .populate('items.productId');

    // Bắn socket thông báo cho Admin có đơn mới
    emitSocketEvent(req, null, 'newOrder', populatedOrder);

    const paymentInfo = paymentMethod === 'SEPAY' ? generateSePayPayment(order) : null;

    res.status(201).json({
      order: populatedOrder,
      paymentInfo
    });
  } catch (error) {
    next(error);
  }
};

// Webhook của SePay để xác nhận thanh toán ngân hàng tự động
const handleSePayWebhook = async (req, res, next) => {
  try {
    // 1. Xác thực API Key từ SePay Webhook (Phương thức Apikey)
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Apikey ')) {
      console.warn('[SEPAY WEBHOOK] Lỗi xác thực: Không tìm thấy Apikey header.');
      return res.status(401).json({ success: false, message: 'Không có quyền truy cập.' });
    }

    const apiKey = authHeader.substring(7).trim();
    const expectedKey = process.env.SEPAY_WEBHOOK_KEY;
    if (expectedKey && apiKey !== expectedKey) {
      console.warn('[SEPAY WEBHOOK] Lỗi xác thực: Apikey không khớp.');
      return res.status(401).json({ success: false, message: 'Khóa bảo mật không chính xác.' });
    }

    const data = req.body;
    console.log('[SEPAY WEBHOOK] Nhận dữ liệu webhook:', JSON.stringify(data));
    
    // Tìm mã hóa đơn dạng DH12345678 trong nội dung chuyển khoản (kiểm tra code, content và description)
    const contentToSearch = `${data.code || ''} ${data.content || ''} ${data.description || ''}`;
    const transactionCode = contentToSearch.match(/DH\d{8}/)?.[0];
    if (!transactionCode) {
      console.warn(`[SEPAY WEBHOOK] Không tìm thấy mã đơn hàng DHxxx trong dữ liệu CK: "${contentToSearch}"`);
      return res.status(200).json({ success: false, message: 'Không tìm thấy mã đơn hàng.' });
    }

    const order = await Order.findOne({ orderNumber: transactionCode });
    if (!order) {
      console.warn(`[SEPAY WEBHOOK] Không tìm thấy đơn hàng tương ứng với mã: ${transactionCode}`);
      return res.status(200).json({ success: false, message: 'Không tìm thấy hóa đơn.' });
    }

    if (order.paymentStatus === 'PAID') {
      return res.status(200).json({ success: true, message: 'Đơn hàng đã được thanh toán trước đó.' });
    }

    // Lấy số tiền giao dịch từ transferAmount (chuẩn SePay) hoặc fallback amount
    const receivedAmount = Number(data.transferAmount || data.amount || 0);

    // Kiểm tra sai số số tiền (Chênh lệch dưới 100đ là hợp lệ)
    const amountMatches = Math.abs(receivedAmount - order.totalAmount) < 100;
    if (!amountMatches) {
      console.warn(`[SEPAY WEBHOOK] Số tiền không khớp. Thực nhận: ${receivedAmount}, Đơn hàng: ${order.totalAmount}`);
      return res.status(200).json({ success: false, message: 'Số tiền thanh toán không trùng khớp.' });
    }

    // Cập nhật trạng thái đơn hàng
    order.paymentStatus = 'PAID';
    order.status = 'CONFIRMED';
    order.paidAt = new Date();
    order.statusLogs.push({
      status: 'CONFIRMED',
      note: `Thanh toán VietQR tự động qua SePay. Số tiền: ${receivedAmount}đ. Mã GD: ${data.id || data.code || 'N/A'}`
    });

    await order.save();

    // Bắn tin nhắn Real-time qua Socket.IO thông báo cho khách hàng
    emitSocketEvent(req, `order_${order._id.toString()}`, 'paymentReceived', {
      orderId: order._id.toString(),
      amount: receivedAmount
    });
    emitSocketEvent(req, `order_${order._id.toString()}`, 'orderStatusChanged', {
      orderId: order._id.toString(),
      status: 'CONFIRMED'
    });

    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};

// Lấy danh sách đơn hàng cho Admin
const getAdminOrders = async (req, res, next) => {
  try {
    const orders = await Order.find()
      .populate('userId', 'id fullName email phone')
      .populate('shipperId', 'id fullName phone')
      .sort({ createdAt: -1 });
    
    res.status(200).json(orders);
  } catch (error) {
    next(error);
  }
};

// Cập nhật trạng thái đơn hàng (Admin & Shipper)
const updateOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, note } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    const order = await Order.findById(id);
    if (!order) {
      throw new ApiError(404, 'Không tìm thấy đơn hàng.');
    }

    // Shipper chỉ được phép đổi trạng thái của đơn hàng do chính mình nhận giao
    if (userRole === 'SHIPPER' && order.shipperId?.toString() !== userId.toString()) {
      throw new ApiError(403, 'Bạn không được phân công giao đơn hàng này.');
    }

    order.status = status;
    order.statusLogs.push({
      status,
      note: note || `Trạng thái được cập nhật bởi ${userRole}`,
      createdBy: userId
    });

    // Nếu giao hàng thành công
    if (status === 'DELIVERED') {
      order.deliveredAt = new Date();
      if (order.paymentMethod === 'COD') {
        order.paymentStatus = 'PAID';
        order.paidAt = new Date();
      }

      // Cộng điểm tích lũy cho khách hàng (10.000đ = 1 điểm)
      const pointsEarned = Math.floor(order.totalAmount / 10000);
      if (pointsEarned > 0) {
        const customer = await User.findById(order.userId);
        if (customer) {
          customer.loyaltyPoints += pointsEarned;
          
          // Thăng hạng thành viên
          let tier = 'BRONZE';
          if (customer.loyaltyPoints >= 300) tier = 'GOLD';
          else if (customer.loyaltyPoints >= 100) tier = 'SILVER';
          
          customer.loyaltyTier = tier;
          await customer.save();
        }
      }
    }

    await order.save();

    // Thông báo trạng thái đổi qua Socket.IO
    emitSocketEvent(req, `order_${order._id.toString()}`, 'orderStatusChanged', {
      orderId: order._id.toString(),
      status
    });

    res.status(200).json(order);
  } catch (error) {
    next(error);
  }
};

// Shipper nhận đơn giao hàng (Claim Order)
const shipperClaimOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const shipperId = req.user.id;

    const order = await Order.findById(id);
    if (!order) {
      throw new ApiError(404, 'Không tìm thấy đơn hàng.');
    }

    if (order.status !== 'READY') {
      throw new ApiError(400, 'Đơn hàng chưa sẵn sàng để đi giao.');
    }

    if (order.shipperId) {
      throw new ApiError(400, 'Đơn hàng này đã có Shipper khác nhận rồi.');
    }

    order.shipperId = shipperId;
    order.status = 'DELIVERING';
    order.statusLogs.push({
      status: 'DELIVERING',
      note: 'Shipper đã tiếp nhận đơn và bắt đầu đi giao.',
      createdBy: shipperId
    });

    await order.save();

    // Thông báo cho khách hàng
    emitSocketEvent(req, `order_${order._id.toString()}`, 'orderStatusChanged', {
      orderId: order._id.toString(),
      status: 'DELIVERING'
    });

    res.status(200).json(order);
  } catch (error) {
    next(error);
  }
};

// Shipper lấy danh sách các đơn hàng đang chờ giao (READY & chưa có shipper)
const getShipperAvailableOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({
      status: 'READY',
      shipperId: null
    })
      .populate('userId', 'id fullName phone')
      .sort({ createdAt: -1 });

    res.status(200).json(orders);
  } catch (error) {
    next(error);
  }
};

// Shipper lấy danh sách đơn hàng mình đang đi giao
const getShipperActiveOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({
      shipperId: req.user.id,
      status: 'DELIVERING'
    })
      .populate('userId', 'id fullName phone')
      .sort({ createdAt: -1 });

    res.status(200).json(orders);
  } catch (error) {
    next(error);
  }
};

// Khách hàng lấy danh sách đơn hàng của mình
const getOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ userId: req.user.id })
      .sort({ createdAt: -1 });
    
    res.status(200).json(orders);
  } catch (error) {
    next(error);
  }
};

// Khách hàng lấy chi tiết một đơn hàng của mình
const getOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id)
      .populate('userId', 'id fullName email phone')
      .populate('shipperId', 'id fullName phone')
      .populate('items.productId');

    if (!order) {
      throw new ApiError(404, 'Không tìm thấy hóa đơn.');
    }

    // Bảo mật: chỉ cho khách hàng đặt đơn đó, admin, hoặc shipper được xem
    const orderUserId = order.userId?._id ? order.userId._id.toString() : order.userId?.toString();
    const orderShipperId = order.shipperId?._id ? order.shipperId._id.toString() : order.shipperId?.toString();

    const isOwner = orderUserId === req.user.id.toString();
    const isAdmin = req.user.role === 'ADMIN';
    const isShipper = req.user.role === 'SHIPPER' && orderShipperId === req.user.id.toString();

    if (!isOwner && !isAdmin && !isShipper) {
      throw new ApiError(403, 'Bạn không có quyền xem thông tin hóa đơn này.');
    }

    const orderObj = order.toJSON();
    // Tạo kèm QR code nếu là đơn ngân hàng và đang chờ thanh toán
    orderObj.paymentInfo = order.paymentMethod === 'SEPAY' && order.status === 'PENDING_PAYMENT'
      ? generateSePayPayment(order)
      : null;

    res.status(200).json(orderObj);
  } catch (error) {
    next(error);
  }
};

// Tạo đánh giá sản phẩm sau khi mua
const createReview = async (req, res, next) => {
  try {
    const { id: orderId } = req.params;
    const { productId, rating, comment, images } = req.body;
    const userId = req.user.id;

    // Xử lý extract productId nếu client truyền dạng string hoặc object { _id/id }
    const targetProductId = typeof productId === 'object' ? (productId._id || productId.id) : productId;

    if (!targetProductId || !mongoose.Types.ObjectId.isValid(targetProductId)) {
      throw new ApiError(400, 'Mã sản phẩm không hợp lệ.');
    }

    // Xác nhận đơn hàng đã giao thành công trước khi đánh giá
    const order = await Order.findOne({ _id: orderId, userId, status: 'DELIVERED' });
    if (!order) {
      throw new ApiError(400, 'Bạn chỉ được đánh giá sản phẩm trên các đơn hàng giao thành công.');
    }

    // Kiểm tra xem sản phẩm có nằm trong danh sách các món của đơn hàng không
    const hasProduct = order.items.some((item) => {
      const pId = item.productId?._id ? item.productId._id.toString() : (item.productId?.toString() || item.product?._id?.toString() || item.product?.id?.toString());
      return pId === targetProductId.toString();
    });

    if (!hasProduct) {
      throw new ApiError(400, 'Sản phẩm này không nằm trong đơn hàng của bạn.');
    }

    // Kiểm tra xem đã đánh giá sản phẩm này trong đơn hàng này chưa
    const existingReview = await Review.findOne({ userId, orderId, productId: targetProductId });
    if (existingReview) {
      throw new ApiError(400, 'Bạn đã đánh giá sản phẩm này cho đơn hàng này rồi.');
    }

    // Tạo đánh giá
    const review = await Review.create({
      userId,
      productId: targetProductId,
      orderId,
      rating,
      comment,
      images: images ? (typeof images === 'string' ? images : JSON.stringify(images)) : '[]'
    });

    // Cập nhật rating trung bình và tổng số review của sản phẩm
    const reviews = await Review.find({ productId: targetProductId });
    const reviewCount = reviews.length;
    const averageRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount;

    await Product.findByIdAndUpdate(targetProductId, {
      averageRating: parseFloat(averageRating.toFixed(1)),
      reviewCount
    });

    res.status(201).json(review);
  } catch (error) {
    if (error.code === 11000) {
      return next(new ApiError(400, 'Bạn đã đánh giá sản phẩm này cho đơn hàng này rồi.'));
    }
    next(error);
  }
};

// Admin quản lý: Lấy danh sách toàn bộ các Coupons
const getAdminCoupons = async (req, res, next) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    res.status(200).json(coupons);
  } catch (error) {
    next(error);
  }
};

// Admin quản lý: Tạo mới Coupon giảm giá
const createCoupon = async (req, res, next) => {
  try {
    const { code, type, value, minOrderAmount, maxUsage, expiresAt, isActive } = req.body;

    const coupon = await Coupon.create({
      code: code.toUpperCase(),
      type,
      value,
      minOrderAmount,
      maxUsage,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      isActive: isActive !== undefined ? isActive : true
    });

    res.status(201).json(coupon);
  } catch (error) {
    next(error);
  }
};

// Admin quản lý: Xóa bỏ Coupon
const deleteCoupon = async (req, res, next) => {
  try {
    const { id } = req.params;
    const coupon = await Coupon.findByIdAndDelete(id);
    if (!coupon) {
      throw new ApiError(404, 'Không tìm thấy mã giảm giá.');
    }
    res.status(200).json({ success: true, message: 'Đã xóa mã giảm giá thành công.' });
  } catch (error) {
    next(error);
  }
};

// Khách hàng: Lấy chi tiết và kiểm tra tính hợp lệ của mã giảm giá
const checkCoupon = async (req, res, next) => {
  try {
    const { code } = req.params;
    const coupon = await Coupon.findOne({ code: code.toUpperCase(), isActive: true });
    
    if (!coupon) {
      throw new ApiError(404, 'Mã giảm giá không hợp lệ hoặc đã hết hạn.');
    }

    if (coupon.maxUsage && coupon.usedCount >= coupon.maxUsage) {
      throw new ApiError(400, 'Mã giảm giá đã đạt số lần sử dụng tối đa.');
    }

    if (coupon.expiresAt && new Date() > coupon.expiresAt) {
      throw new ApiError(400, 'Mã giảm giá đã hết hạn.');
    }

    res.status(200).json(coupon);
  } catch (error) {
    next(error);
  }
};

// Admin quản lý: Lấy toàn bộ danh sách Review từ khách hàng
const getAdminReviews = async (req, res, next) => {
  try {
    const reviews = await Review.find()
      .populate('userId', 'id fullName email')
      .populate('productId', 'id name image')
      .sort({ createdAt: -1 });
    
    res.status(200).json(reviews);
  } catch (error) {
    next(error);
  }
};

// Lấy báo cáo thống kê doanh thu 7 ngày gần nhất (Admin Dashboard)
const getRevenueAnalytics = async (req, res, next) => {
  try {
    const analytics = [];
    
    // Vòng lặp lấy dữ liệu doanh thu của 7 ngày qua
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      const startOfDay = new Date(date.setHours(0, 0, 0, 0));
      const endOfDay = new Date(date.setHours(23, 59, 59, 999));

      const orders = await Order.find({
        status: 'DELIVERED',
        createdAt: { $gte: startOfDay, $lte: endOfDay }
      });

      const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);

      // Format ngày gửi về giống kiểu ISO Date String rút gọn
      const label = startOfDay.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
      analytics.push({
        date: label,
        label: label,
        revenue: totalRevenue,
        value: totalRevenue
      });
    }

    res.status(200).json(analytics);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createOrder,
  handleSePayWebhook,
  getAdminOrders,
  updateOrderStatus,
  shipperClaimOrder,
  getShipperAvailableOrders,
  getShipperActiveOrders,
  getOrders,
  getOrderById,
  createReview,
  getAdminCoupons,
  createCoupon,
  deleteCoupon,
  checkCoupon,
  getAdminReviews,
  getRevenueAnalytics
};
