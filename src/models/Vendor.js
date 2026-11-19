const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema({
  storeName: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  ownerName: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    index: true
  },
  phone: {
    type: String,
    required: true
  },
  businessAddress: String,
  businessType: String,
  logo: {
    url: String,
    publicId: String
  },
  description: String,
  totalProducts: {
    type: Number,
    default: 0
  },
  totalSales: {
    type: Number,
    default: 0
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'suspended', 'rejected'],
    default: 'pending',
    index: true
  },
  commissionRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  bankDetails: {
    accountHolder: String,
    accountNumber: String,
    bankName: String,
    iban: String
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Vendor', vendorSchema);
