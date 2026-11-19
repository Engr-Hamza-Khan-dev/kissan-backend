const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const { authMiddleware } = require('../middleware/auth');

// ============ PUBLIC ROUTES (Webhooks - no auth required) ============
// Payment gateway webhooks (called by external services)
router.post('/webhook/jazzcash', paymentController.jazzCashWebhook);
router.post('/webhook/easypaisa', paymentController.easyPaisaWebhook);
router.post('/webhook/stripe', paymentController.stripeWebhook);

// ============ PROTECTED ROUTES (Requires auth) ============

// Initiate payments
router.post('/cod', authMiddleware, paymentController.initiateCODPayment);
router.post('/online', authMiddleware, paymentController.initiateOnlinePayment);

// Payment status
router.get('/:orderId/status', authMiddleware, paymentController.getPaymentStatus);

// Admin: Collect COD payment
router.post('/:orderId/collect-cod', authMiddleware, paymentController.collectCODPayment);

// Admin: Initiate refund
router.post('/:orderId/refund', authMiddleware, paymentController.refundPayment);

// Admin: View all payments
router.get('/', authMiddleware, paymentController.getAllPayments);

// Admin: Get payment by ID
router.get('/:id', authMiddleware, paymentController.getPaymentById);

module.exports = router;
