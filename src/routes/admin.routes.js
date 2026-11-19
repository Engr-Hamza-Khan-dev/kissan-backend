const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

// Protected routes - super admin only
router.get('/dashboard', authMiddleware, adminController.getDashboardStats);
router.get('/list', authMiddleware, roleMiddleware(['super_admin']), adminController.listAdmins);
router.get('/:id', authMiddleware, roleMiddleware(['super_admin']), adminController.getAdminById);
router.put('/:id', authMiddleware, roleMiddleware(['super_admin']), adminController.updateAdmin);
router.delete('/:id', authMiddleware, roleMiddleware(['super_admin']), adminController.deleteAdmin);

module.exports = router;
