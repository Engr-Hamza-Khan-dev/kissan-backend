const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const { authMiddleware } = require('../middleware/auth');

// Protected routes
router.post('/', authMiddleware, notificationController.createNotification);
router.get('/', authMiddleware, notificationController.getAllNotifications);
router.get('/:id', authMiddleware, notificationController.getNotificationById);
router.put('/:id/read', authMiddleware, notificationController.markAsRead);
router.put('/mark-all/read', authMiddleware, notificationController.markAllAsRead);
router.delete('/:id', authMiddleware, notificationController.deleteNotification);

module.exports = router;
