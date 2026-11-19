const mongoose = require('mongoose');

const orderContactLogSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
    index: true
  },
  contactMethod: {
    type: String,
    enum: ['WHATSAPP', 'PHONE', 'EMAIL', 'SMS', 'OTHER'],
    required: true
  },
  initiatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  contactNumber: {
    type: String,
    required: true
  },
  message: String,
  result: {
    type: String,
    enum: [
      'PENDING',
      'CONTACTED_WAITING_RESPONSE',
      'CUSTOMER_CONFIRMED',
      'CUSTOMER_CANCELLED',
      'CUSTOMER_DID_NOT_ANSWER',
      'WRONG_NUMBER',
      'NO_RESPONSE',
      'OTHER'
    ],
    default: 'PENDING'
  },
  notes: String,
  followUpDate: Date,
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

// Index for retrieving contact history by order
orderContactLogSchema.index({ orderId: 1, createdAt: -1 });

module.exports = mongoose.model('OrderContactLog', orderContactLogSchema);
