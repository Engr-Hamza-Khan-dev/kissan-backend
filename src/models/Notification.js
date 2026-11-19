const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['info', 'warning', 'success', 'error'],
    default: 'info'
  },
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  isRead: {
    type: Boolean,
    default: false
  },
  relatedOrderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  },
  relatedCustomerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Notification', notificationSchema);
