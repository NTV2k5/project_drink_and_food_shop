const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    unique: true,
    sparse: true, // Allow multiple users to not have an email if phone is used
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    unique: true,
    sparse: true,
    trim: true
  },
  passwordHash: {
    type: String,
    required: false
  },
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  avatar: {
    type: String,
    default: null
  },
  role: {
    type: String,
    enum: ['CUSTOMER', 'ADMIN', 'SHIPPER'],
    default: 'CUSTOMER'
  },
  loyaltyPoints: {
    type: Number,
    default: 0
  },
  loyaltyTier: {
    type: String,
    enum: ['BRONZE', 'SILVER', 'GOLD'],
    default: 'BRONZE'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  addresses: [{
    label: {
      type: String,
      default: 'Nhà'
    },
    fullAddress: {
      type: String,
      required: true,
      trim: true
    },
    lat: {
      type: Number,
      default: null
    },
    lng: {
      type: Number,
      default: null
    },
    isDefault: {
      type: Boolean,
      default: false
    }
  }],
  workingBranchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Location',
    default: null
  }
}, {
  timestamps: true
});

// Configure toJSON to expose virtual id and remove _id/__v
userSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
  }
});

module.exports = mongoose.model('User', userSchema);
