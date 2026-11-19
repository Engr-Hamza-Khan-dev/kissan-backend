const mongoose = require('mongoose');

const orderStatusHistorySchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
    index: true
  },
  statusType: {
    type: String,
    enum: ['ORDER_STATUS', 'PAYMENT_STATUS', 'VERIFICATION_STATUS'],
    required: true
  },
  previousStatus: String,
  newStatus: String,
  changedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  systemTriggered: {
    type: Boolean,
    default: false
  },
  reason: String,
  notes: String,
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// Index for retrieving history by order
orderStatusHistorySchema.index({ orderId: 1, createdAt: -1 });

module.exports = mongoose.model('OrderStatusHistory', orderStatusHistorySchema);
