const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    unique: true,
    required: true,
    index: true
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: false,
    index: true
  },
  guestCustomerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GuestCustomer',
    required: false,
    index: true
  },
  isGuest: {
    type: Boolean,
    default: false
  },
  customerInfo: {
    fullName: String,
    phone: String,
    whatsappNumber: String,
    email: String,
    customerType: {
      type: String,
      enum: ['individual', 'business'],
      default: 'individual'
    }
  },
  items: [
    {
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
      },
      vendorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vendor'
      },
      productName: String,
      quantity: {
        type: Number,
        required: true,
        min: 1
      },
      price: {
        type: Number,
        required: true,
        min: 0
      },
      subtotal: Number,
      images: [
        {
          url: String,
          publicId: String
        }
      ]
    }
  ],
  deliveryAddress: {
    province: String,
    city: String,
    area: String,
    address: String,
    landmark: String,
    postalCode: String
  },
  deliveryCharges: {
    type: Number,
    default: 0,
    min: 0
  },
  discount: {
    type: Number,
    default: 0,
    min: 0
  },
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  orderStatus: {
    type: String,
    enum: [
      'PENDING_VERIFICATION',
      'CONFIRMED',
      'PROCESSING',
      'READY_TO_SHIP',
      'SHIPPED',
      'DELIVERED',
      'CANCELLED',
      'REJECTED'
    ],
    default: 'PENDING_VERIFICATION',
    index: true
  },
  paymentMethod: {
    type: String,
    enum: ['COD', 'ONLINE_PAYMENT'],
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['PENDING', 'PAID', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED'],
    default: 'PENDING',
    index: true
  },
  paymentReference: String,
  paymentDate: Date,
  verificationStatus: {
    type: String,
    enum: ['PENDING', 'VERIFIED', 'FAILED', 'UNABLE_TO_CONTACT'],
    default: 'PENDING',
    index: true
  },
  verificationMethod: {
    type: String,
    enum: ['WHATSAPP', 'PHONE', 'OTHER'],
    default: null
  },
  verificationDate: Date,
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  verificationNotes: String,
  shippingAddress: {
    address: String,
    city: String,
    province: String
  },
  notes: String,
  idempotencyKey: {
    type: String,
    unique: true,
    sparse: true,
    index: true
  },
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
orderSchema.index({ createdAt: -1 });
orderSchema.index({ customerId: 1, createdAt: -1 });
orderSchema.index({ orderStatus: 1, paymentStatus: 1 });

module.exports = mongoose.model('Order', orderSchema);
