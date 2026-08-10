const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  productName: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  unitPrice: {
    type: Number,
    required: true
  },
  selectedOptions: {
    type: Array, // Array of Dto objects selected by client
    default: []
  },
  note: {
    type: String,
    default: null
  },
  subtotal: {
    type: Number,
    required: true
  }
});

orderItemSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    ret.id = ret._id ? ret._id.toString() : ret.id;
    if (ret.productId && typeof ret.productId === 'object') {
      ret.product = ret.productId;
      ret.productId = ret.productId._id ? ret.productId._id.toString() : (ret.productId.id || ret.productId);
    }
    delete ret._id;
  }
});

const orderStatusLogSchema = new mongoose.Schema({
  status: {
    type: String,
    required: true
  },
  note: {
    type: String,
    default: null
  },
  createdBy: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    required: true,
    unique: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['PENDING_PAYMENT', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERING', 'DELIVERED', 'CANCELLED'],
    default: 'PENDING_PAYMENT'
  },
  subtotal: {
    type: Number,
    required: true
  },
  shippingFee: {
    type: Number,
    required: true
  },
  discountAmount: {
    type: Number,
    default: 0
  },
  totalAmount: {
    type: Number,
    required: true
  },
  paymentMethod: {
    type: String,
    enum: ['COD', 'SEPAY'],
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['PENDING', 'PAID', 'FAILED', 'REFUNDED'],
    default: 'PENDING'
  },
  couponId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Coupon',
    default: null
  },
  deliveryAddress: {
    label: String,
    fullAddress: String,
    lat: Number,
    lng: Number
  },
  deliveryLat: {
    type: Number,
    required: true
  },
  deliveryLng: {
    type: Number,
    required: true
  },
  note: {
    type: String,
    default: null
  },
  cancelReason: {
    type: String,
    default: null
  },
  pointsUsed: {
    type: Number,
    default: 0
  },
  pointsDiscount: {
    type: Number,
    default: 0
  },
  requestInvoice: {
    type: Boolean,
    default: false
  },
  shipperId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  startLocationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Location',
    default: null
  },
  paidAt: {
    type: Date,
    default: null
  },
  deliveredAt: {
    type: Date,
    default: null
  },
  items: [orderItemSchema],
  statusLogs: [orderStatusLogSchema]
}, {
  timestamps: true
});

orderSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    ret.id = ret._id.toString();
    // Ánh xạ userId/shipperId sang user/shipper để phù hợp với cách đọc ở Frontend
    if (ret.userId && typeof ret.userId === 'object') {
      ret.user = ret.userId;
    }
    if (ret.shipperId && typeof ret.shipperId === 'object') {
      ret.shipper = ret.shipperId;
    }
    delete ret._id;
  }
});

module.exports = mongoose.model('Order', orderSchema);
