const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order.controller');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

// ============ PUBLIC ROUTES ============
// Guest order creation (no auth required)
router.post('/create', orderController.createGuestOrder);

// ============ PROTECTED ROUTES (Requires auth) ============
// Admin: Get all orders with filters
router.get('/', authMiddleware, orderController.getAllOrders);

// Admin: Get order by ID with full details
router.get('/:id', authMiddleware, orderController.getOrderById);

// Admin: Get order timeline/history
router.get('/:id/timeline', authMiddleware, orderController.getOrderTimeline);

// Admin: Get contact history
router.get('/:id/contacts', authMiddleware, orderController.getContactHistory);

// Admin: Update order status
router.put('/:id/status', authMiddleware, orderController.updateOrderStatus);

// Admin: Update payment status
router.put('/:id/payment', authMiddleware, orderController.updatePaymentStatus);

// Admin: Verify order
router.put('/:id/verify', authMiddleware, orderController.verifyOrder);

// Admin: Mark unable to contact
router.put('/:id/unable-to-contact', authMiddleware, orderController.markUnableToContact);

// Admin: Reject order
router.put('/:id/reject', authMiddleware, orderController.rejectOrder);

// Admin: Add contact log
router.post('/:id/contact-log', authMiddleware, orderController.addContactLog);

// Admin: Delete order
router.delete('/:id', authMiddleware, orderController.deleteOrder);

module.exports = router;
