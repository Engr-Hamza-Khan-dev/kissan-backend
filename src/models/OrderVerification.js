const mongoose = require('mongoose');

const orderVerificationSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
    unique: true,
    index: true
  },
  status: {
    type: String,
    enum: ['PENDING', 'VERIFIED', 'FAILED', 'UNABLE_TO_CONTACT'],
    default: 'PENDING',
    index: true
  },
  method: {
    type: String,
    enum: ['WHATSAPP', 'PHONE', 'EMAIL', 'OTHER'],
    default: null
  },
  verificationDate: Date,
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  notes: String,
  contactAttempts: {
    type: Number,
    default: 0
  },
  lastContactAttempt: Date,
  rejectionReason: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('OrderVerification', orderVerificationSchema);
