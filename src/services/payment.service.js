const Payment = require('../models/Payment');
const Order = require('../models/Order');
const { normalizePhoneNumber } = require('../utils/helpers');

/**
 * Payment Service - Handles all payment processing
 * Supports: COD (Cash on Delivery), Online Payments
 */

// ============ COD PAYMENT ============
/**
 * Process COD (Cash on Delivery) payment
 * For COD, payment status remains PENDING until customer pays upon delivery
 */
exports.initiateCODPayment = async (orderId) => {
  try {
    const order = await Order.findById(orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    // For COD, payment starts as PENDING
    const payment = new Payment({
      orderId,
      amount: order.totalAmount,
      paymentMethod: 'COD',
      status: 'PENDING',
      notes: 'Payment will be collected upon delivery'
    });

    await payment.save();

    // Update order payment reference
    await Order.findByIdAndUpdate(orderId, {
      paymentStatus: 'PENDING',
      paymentMethod: 'COD'
    });

    return {
      success: true,
      payment,
      message: 'COD order created. Payment will be collected on delivery.'
    };
  } catch (error) {
    throw new Error(`COD Payment Error: ${error.message}`);
  }
};

/**
 * Mark COD payment as collected (Admin action after delivery)
 */
exports.markCODPaymentCollected = async (orderId, collectionNotes = '') => {
  try {
    const payment = await Payment.findOneAndUpdate(
      { orderId },
      {
        status: 'SUCCESS',
        paymentDate: new Date(),
        notes: collectionNotes || 'Payment collected upon delivery'
      },
      { new: true }
    );

    if (!payment) {
      throw new Error('Payment record not found');
    }

    // Update order payment status
    await Order.findByIdAndUpdate(orderId, {
      paymentStatus: 'PAID',
      paymentDate: new Date()
    });

    return {
      success: true,
      payment,
      message: 'COD payment marked as collected'
    };
  } catch (error) {
    throw new Error(`COD Collection Error: ${error.message}`);
  }
};

// ============ ONLINE PAYMENT ============
/**
 * Initiate online payment
 * This prepares the payment but doesn't mark it as paid until gateway confirms
 */
exports.initiateOnlinePayment = async (orderId, paymentGateway = 'JAZZPAY') => {
  try {
    const order = await Order.findById(orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    if (!order.customerInfo?.phone || !order.customerInfo?.email) {
      throw new Error('Customer phone and email required for online payment');
    }

    const payment = new Payment({
      orderId,
      amount: order.totalAmount,
      paymentMethod: 'ONLINE_PAYMENT',
      paymentGateway,
      status: 'PROCESSING',
      notes: `Payment processing via ${paymentGateway}`
    });

    await payment.save();

    // Update order
    await Order.findByIdAndUpdate(orderId, {
      paymentStatus: 'PENDING',
      paymentMethod: 'ONLINE_PAYMENT'
    });

    // Generate payment initiation response based on gateway
    const paymentInitiation = generatePaymentInitiation(order, paymentGateway);

    return {
      success: true,
      payment,
      paymentInitiation,
      message: 'Online payment initiated'
    };
  } catch (error) {
    throw new Error(`Online Payment Error: ${error.message}`);
  }
};

/**
 * Generate payment gateway initiation data
 * This is a template - actual implementation depends on chosen gateway
 */
const generatePaymentInitiation = (order, gateway) => {
  const baseData = {
    orderId: order.orderId,
    amount: order.totalAmount,
    currency: 'PKR',
    customerName: order.customerInfo.fullName,
    customerPhone: normalizePhoneNumber(order.customerInfo.phone),
    customerEmail: order.customerInfo.email,
    description: `Order ${order.orderId} - ${order.items.length} items`,
    redirectUrl: `${process.env.FRONTEND_URL}/order-confirmation/${order.orderId}`,
    webhookUrl: `${process.env.BACKEND_URL}/api/payments/webhook/${gateway}`
  };

  switch (gateway) {
    case 'JAZZPAY':
      return generateJazzPayInitiation(baseData);
    case 'EASYPAISA':
      return generateEasyPaisaInitiation(baseData);
    case 'STRIPE':
      return generateStripeInitiation(baseData);
    default:
      throw new Error(`Unsupported payment gateway: ${gateway}`);
  }
};

/**
 * JazzCash Payment Gateway Integration
 * Requires: JAZZCASH_MERCHANT_ID, JAZZCASH_PASSWORD, JAZZCASH_PPURL
 */
const generateJazzPayInitiation = (baseData) => {
  if (!process.env.JAZZCASH_MERCHANT_ID || !process.env.JAZZCASH_PASSWORD) {
    throw new Error('JazzCash credentials not configured');
  }

  return {
    gateway: 'JAZZPAY',
    merchantId: process.env.JAZZCASH_MERCHANT_ID,
    orderId: baseData.orderId,
    amount: baseData.amount,
    currency: baseData.currency,
    description: baseData.description,
    customerName: baseData.customerName,
    customerPhone: baseData.customerPhone,
    customerEmail: baseData.customerEmail,
    redirectUrl: baseData.redirectUrl,
    testMode: process.env.NODE_ENV !== 'production',
    integrationUrl: process.env.NODE_ENV === 'production'
      ? 'https://payment.jazzcash.com.pk/ApplicationAPI/API/Payment/DoTransaction'
      : 'https://sandbox.jazzcash.com.pk/ApplicationAPI/API/Payment/DoTransaction'
  };
};

/**
 * EasyPaisa Payment Gateway Integration
 * Requires: EASYPAISA_MERCHANT_ID, EASYPAISA_SECURE_KEY
 */
const generateEasyPaisaInitiation = (baseData) => {
  if (!process.env.EASYPAISA_MERCHANT_ID || !process.env.EASYPAISA_SECURE_KEY) {
    throw new Error('EasyPaisa credentials not configured');
  }

  return {
    gateway: 'EASYPAISA',
    merchantId: process.env.EASYPAISA_MERCHANT_ID,
    orderId: baseData.orderId,
    amount: baseData.amount,
    currency: baseData.currency,
    description: baseData.description,
    customerName: baseData.customerName,
    customerPhone: baseData.customerPhone,
    customerEmail: baseData.customerEmail,
    redirectUrl: baseData.redirectUrl,
    testMode: process.env.NODE_ENV !== 'production',
    integrationUrl: process.env.NODE_ENV === 'production'
      ? 'https://apigateway.easypaisa.com.pk/api/v2/Transaction/InitiateTransaction'
      : 'https://sandbox.easypaisa.com.pk/api/v2/Transaction/InitiateTransaction'
  };
};

/**
 * Stripe Payment Gateway Integration
 * Requires: STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY
 */
const generateStripeInitiation = (baseData) => {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_PUBLISHABLE_KEY) {
    throw new Error('Stripe credentials not configured');
  }

  return {
    gateway: 'STRIPE',
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    orderId: baseData.orderId,
    amount: Math.round(baseData.amount * 100), // Stripe uses cents
    currency: baseData.currency,
    description: baseData.description,
    customerName: baseData.customerName,
    customerEmail: baseData.customerEmail,
    redirectUrl: baseData.redirectUrl,
    testMode: process.env.NODE_ENV !== 'production'
  };
};

// ============ PAYMENT VERIFICATION ============
/**
 * Verify online payment from gateway callback
 * This is called by webhook - never trust frontend success messages
 */
exports.verifyPaymentCallback = async (orderId, gateway, callbackData) => {
  try {
    const order = await Order.findById(orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    let isPaymentSuccessful = false;
    let transactionReference = null;

    switch (gateway) {
      case 'JAZZPAY':
        ({ isPaymentSuccessful, transactionReference } = verifyJazzCashCallback(callbackData));
        break;
      case 'EASYPAISA':
        ({ isPaymentSuccessful, transactionReference } = verifyEasyPaisaCallback(callbackData));
        break;
      case 'STRIPE':
        ({ isPaymentSuccessful, transactionReference } = verifyStripeCallback(callbackData));
        break;
      default:
        throw new Error(`Unsupported gateway: ${gateway}`);
    }

    if (!isPaymentSuccessful) {
      // Payment failed
      const payment = await Payment.findOneAndUpdate(
        { orderId },
        {
          status: 'FAILED',
          gatewayResponse: callbackData,
          transactionReference
        },
        { new: true }
      );

      await Order.findByIdAndUpdate(orderId, {
        paymentStatus: 'FAILED'
      });

      return {
        success: false,
        payment,
        message: 'Payment verification failed'
      };
    }

    // Payment successful
    const payment = await Payment.findOneAndUpdate(
      { orderId },
      {
        status: 'SUCCESS',
        paymentDate: new Date(),
        transactionReference,
        gatewayResponse: callbackData
      },
      { new: true }
    );

    await Order.findByIdAndUpdate(orderId, {
      paymentStatus: 'PAID',
      paymentReference: transactionReference,
      paymentDate: new Date()
    });

    return {
      success: true,
      payment,
      message: 'Payment verified successfully'
    };
  } catch (error) {
    throw new Error(`Payment Verification Error: ${error.message}`);
  }
};

/**
 * Verify JazzCash callback signature and status
 */
const verifyJazzCashCallback = (callbackData) => {
  // In production, verify HMAC signature
  // This is a simplified version
  const isSuccessful = callbackData.pp_ResponseCode === '000' || callbackData.pp_ResponseCode === '0';
  return {
    isPaymentSuccessful: isSuccessful,
    transactionReference: callbackData.pp_TransactionID || callbackData.pp_ReferenceNumber
  };
};

/**
 * Verify EasyPaisa callback signature and status
 */
const verifyEasyPaisaCallback = (callbackData) => {
  // In production, verify signature
  const isSuccessful = callbackData.ResponseCode === '0000';
  return {
    isPaymentSuccessful: isSuccessful,
    transactionReference: callbackData.TransactionID || callbackData.RequestID
  };
};

/**
 * Verify Stripe callback signature and status
 */
const verifyStripeCallback = (callbackData) => {
  // In production, verify webhook signature using Stripe SDK
  const isSuccessful = callbackData.type === 'payment_intent.succeeded';
  return {
    isPaymentSuccessful: isSuccessful,
    transactionReference: callbackData.data?.object?.id
  };
};

// ============ REFUND HANDLING ============
/**
 * Initiate refund for a paid order
 */
exports.refundPayment = async (orderId, refundAmount, reason) => {
  try {
    const payment = await Payment.findOne({ orderId });
    if (!payment) {
      throw new Error('Payment record not found');
    }

    if (payment.status !== 'SUCCESS') {
      throw new Error('Only successful payments can be refunded');
    }

    if (refundAmount > payment.amount) {
      throw new Error('Refund amount cannot exceed original payment');
    }

    // In production, call payment gateway refund API
    const refundedPayment = await Payment.findOneAndUpdate(
      { orderId },
      {
        status: refundAmount === payment.amount ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
        refundAmount,
        refundDate: new Date(),
        refundReason: reason
      },
      { new: true }
    );

    // Update order
    const newPaymentStatus = refundAmount === payment.amount ? 'REFUNDED' : 'PARTIALLY_REFUNDED';
    await Order.findByIdAndUpdate(orderId, {
      paymentStatus: newPaymentStatus
    });

    return {
      success: true,
      payment: refundedPayment,
      message: 'Refund initiated successfully'
    };
  } catch (error) {
    throw new Error(`Refund Error: ${error.message}`);
  }
};

// ============ PAYMENT STATUS CHECK ============
/**
 * Check payment status for an order
 */
exports.getPaymentStatus = async (orderId) => {
  try {
    const payment = await Payment.findOne({ orderId });
    if (!payment) {
      return {
        success: false,
        message: 'No payment record found'
      };
    }

    return {
      success: true,
      payment,
      isPaid: payment.status === 'SUCCESS',
      isRefunded: ['REFUNDED', 'PARTIALLY_REFUNDED'].includes(payment.status),
      isFailed: payment.status === 'FAILED'
    };
  } catch (error) {
    throw new Error(`Status Check Error: ${error.message}`);
  }
};
