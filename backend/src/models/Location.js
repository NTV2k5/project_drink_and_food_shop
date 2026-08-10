const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  address: {
    type: String,
    required: true,
    trim: true
  },
  latitude: {
    type: Number,
    required: false, // Automatically populated by Geocoding API if not manually input
    default: null
  },
  longitude: {
    type: Number,
    required: false, // Automatically populated by Geocoding API if not manually input
    default: null
  },
  description: {
    type: String,
    default: null
  },
  phone: {
    type: String,
    default: null,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

locationSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
  }
});

module.exports = mongoose.model('Location', locationSchema);
