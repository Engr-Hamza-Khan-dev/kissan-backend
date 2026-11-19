const mongoose = require('mongoose');

const guestCustomerSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true,
    index: true
  },
  whatsappNumber: String,
  email: {
    type: String,
    sparse: true,
    lowercase: true,
    index: true
  },
  customerType: {
    type: String,
    enum: ['individual', 'business'],
    default: 'individual'
  },
  deliveryAddress: {
    province: String,
    city: String,
    area: String,
    address: String,
    landmark: String,
    postalCode: String
  },
  orderCount: {
    type: Number,
    default: 0
  },
  totalSpent: {
    type: Number,
    default: 0
  },
  lastOrderDate: Date,
  notes: String,
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Index for finding returning guests
guestCustomerSchema.index({ phone: 1, email: 1 });
guestCustomerSchema.index({ createdAt: -1 });

module.exports = mongoose.model('GuestCustomer', guestCustomerSchema);
