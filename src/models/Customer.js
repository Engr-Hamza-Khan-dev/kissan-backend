const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    sparse: true,
    lowercase: true,
    index: true
  },
  phone: {
    type: String,
    required: true,
    index: true
  },
  whatsappNumber: String,
  address: String,
  city: String,
  province: String,
  customerType: {
    type: String,
    enum: ['individual', 'business'],
    default: 'individual'
  },
  totalOrders: {
    type: Number,
    default: 0
  },
  totalSpent: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'blocked'],
    default: 'active'
  },
  joinedAt: {
    type: Date,
    default: Date.now
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

// Compound index for finding customers by phone and email
customerSchema.index({ phone: 1, email: 1 });

module.exports = mongoose.model('Customer', customerSchema);
