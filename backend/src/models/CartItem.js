const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
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
  quantity: {
    type: Number,
    default: 1,
    min: 1
  },
  selectedOptions: {
    type: Array, // Array of options { groupId, optionId }
    default: []
  },
  note: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

cartItemSchema.index({ userId: 1 });

cartItemSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
  }
});

module.exports = mongoose.model('CartItem', cartItemSchema);
