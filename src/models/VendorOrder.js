const mongoose = require('mongoose');

const vendorOrderSchema = new mongoose.Schema({
  parentOrderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
    index: true
  },
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true,
    index: true
  },
  vendorOrderId: {
    type: String,
    unique: true,
    required: true
  },
  items: [
    {
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
      },
      productName: String,
      quantity: {
        type: Number,
        required: true
      },
      price: {
        type: Number,
        required: true
      },
      subtotal: Number
    }
  ],
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  commission: {
    type: Number,
    default: 0,
    min: 0
  },
  vendorEarnings: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: [
      'PENDING',
      'CONFIRMED',
      'PROCESSING',
      'READY_TO_SHIP',
      'SHIPPED',
      'DELIVERED',
      'CANCELLED',
      'REJECTED'
    ],
    default: 'PENDING',
    index: true
  },
  shippingAddress: {
    province: String,
    city: String,
    area: String,
    address: String,
    landmark: String,
    postalCode: String
  },
  shippingProvider: String,
  trackingNumber: String,
  shippedDate: Date,
  estimatedDeliveryDate: Date,
  deliveredDate: Date,
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

// Indexes for common queries
vendorOrderSchema.index({ vendorId: 1, createdAt: -1 });
vendorOrderSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('VendorOrder', vendorOrderSchema);
