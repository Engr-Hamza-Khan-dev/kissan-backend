const Payment = require('../models/Payment');
const Order = require('../models/Order');
const paymentService = require('../services/payment.service');

// ============ INITIATE COD PAYMENT ============
// POST /api/payments/cod
exports.initiateCODPayment = async (req, res) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ error: 'orderId is required' });
    }

    const result = await paymentService.initiateCODPayment(orderId);
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ============ INITIATE ONLINE PAYMENT ============
// POST /api/payments/online
exports.initiateOnlinePayment = async (req, res) => {
  try {
    const { orderId, paymentGateway = 'JAZZPAY' } = req.body;

    if (!orderId) {
      return res.status(400).json({ error: 'orderId is required' });
    }

    // Validate gateway
    const supportedGateways = ['JAZZPAY', 'EASYPAISA', 'STRIPE'];
    if (!supportedGateways.includes(paymentGateway)) {
      return res.status(400).json({
        error: `Invalid gateway. Supported: ${supportedGateways.join(', ')}`
      });
    }

    const result = await paymentService.initiateOnlinePayment(orderId, paymentGateway);
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ============ PAYMENT GATEWAY WEBHOOKS ============
// POST /api/payments/webhook/jazzcash
exports.jazzCashWebhook = async (req, res) => {
  try {
    const { pp_OrderID: orderId, ...callbackData } = req.body;

    if (!orderId) {
      return res.status(400).json({ error: 'Order ID not found in callback' });
    }

    const result = await paymentService.verifyPaymentCallback(
      orderId,
      'JAZZPAY',
      callbackData
    );

    res.json(result);
  } catch (error) {
    console.error('JazzCash webhook error:', error);
    res.status(500).json({ error: error.message });
  }
};

// POST /api/payments/webhook/easypaisa
exports.easyPaisaWebhook = async (req, res) => {
  try {
    const { RequestID: orderId, ...callbackData } = req.body;

    if (!orderId) {
      return res.status(400).json({ error: 'Request ID not found in callback' });
    }

    const result = await paymentService.verifyPaymentCallback(
      orderId,
      'EASYPAISA',
      callbackData
    );

    res.json(result);
  } catch (error) {
    console.error('EasyPaisa webhook error:', error);
    res.status(500).json({ error: error.message });
  }
};

// POST /api/payments/webhook/stripe
exports.stripeWebhook = async (req, res) => {
  try {
    const { data } = req.body;

    if (!data?.object?.metadata?.orderId) {
      return res.status(400).json({ error: 'Order ID not found in webhook' });
    }

    const orderId = data.object.metadata.orderId;
    const result = await paymentService.verifyPaymentCallback(
      orderId,
      'STRIPE',
      req.body
    );

    res.json(result);
  } catch (error) {
    console.error('Stripe webhook error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ============ MARK COD PAYMENT COLLECTED ============
// POST /api/payments/:orderId/collect-cod
exports.collectCODPayment = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { notes } = req.body;

    if (!orderId) {
      return res.status(400).json({ error: 'orderId is required' });
    }

    const result = await paymentService.markCODPaymentCollected(orderId, notes);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ============ INITIATE REFUND ============
// POST /api/payments/:orderId/refund
exports.refundPayment = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { refundAmount, reason } = req.body;

    if (!orderId || !refundAmount) {
      return res.status(400).json({ error: 'orderId and refundAmount are required' });
    }

    const result = await paymentService.refundPayment(
      orderId,
      refundAmount,
      reason || 'No reason provided'
    );

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ============ GET PAYMENT STATUS ============
// GET /api/payments/:orderId/status
exports.getPaymentStatus = async (req, res) => {
  try {
    const { orderId } = req.params;

    if (!orderId) {
      return res.status(400).json({ error: 'orderId is required' });
    }

    const result = await paymentService.getPaymentStatus(orderId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ============ GET ALL PAYMENTS (Admin) ============
// GET /api/payments
exports.getAllPayments = async (req, res) => {
  try {
    const { status, paymentMethod, startDate, endDate, page = 1, limit = 10 } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (paymentMethod) filter.paymentMethod = paymentMethod;

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;

    const payments = await Payment.find(filter)
      .populate('orderId', 'orderId totalAmount orderStatus')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Payment.countDocuments(filter);

    res.json({
      success: true,
      payments,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ============ GET PAYMENT BY ID ============
// GET /api/payments/:id
exports.getPaymentById = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('orderId');

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    res.json({ success: true, payment });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
