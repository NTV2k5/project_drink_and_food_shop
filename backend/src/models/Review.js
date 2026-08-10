const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  orderId: {
    type: String, // String ID for simplicity/compatibility
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    default: null
  },
  images: {
    type: String,
    default: "[]"
  }
}, {
  timestamps: true
});

// Compound index to match unique constraint in Prisma
reviewSchema.index({ userId: 1, orderId: 1, productId: 1 }, { unique: true });

reviewSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    ret.id = ret._id.toString();
    if (ret.userId && typeof ret.userId === 'object') {
      ret.user = ret.userId;
    }
    if (ret.productId && typeof ret.productId === 'object') {
      ret.product = ret.productId;
    }
    delete ret._id;
  }
});

module.exports = mongoose.model('Review', reviewSchema);
