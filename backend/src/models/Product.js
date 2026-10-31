const mongoose = require('mongoose');

const productOptionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  extraPrice: {
    type: Number,
    default: 0
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  sortOrder: {
    type: Number,
    default: 0
  }
});

productOptionSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
  }
});

const productOptionGroupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  required: {
    type: Boolean,
    default: true
  },
  minSelect: {
    type: Number,
    default: 1
  },
  maxSelect: {
    type: Number,
    default: 1
  },
  sortOrder: {
    type: Number,
    default: 0
  },
  options: [productOptionSchema]
});

productOptionGroupSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
  }
});

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  description: {
    type: String,
    default: null
  },
  basePrice: {
    type: Number,
    required: true
  },
  image: {
    type: String,
    default: null
  },
  images: {
    type: String,
    default: "[]" // Keep compatible with SQLite string representation of JSON array
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  sortOrder: {
    type: Number,
    default: 0
  },
  salesCount: {
    type: Number,
    default: 0,
    index: true
  },
  optionGroups: [productOptionGroupSchema],
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  reviewCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Production indexes for high-concurrency read queries
productSchema.index({ isAvailable: 1, sortOrder: 1 });
productSchema.index({ categoryId: 1, isAvailable: 1 });
productSchema.index({ isAvailable: 1, salesCount: -1 });
productSchema.index({ basePrice: 1 });
productSchema.index({ isFeatured: 1 });
productSchema.index({ name: 'text', description: 'text' });

productSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
  }
});

module.exports = mongoose.model('Product', productSchema);
