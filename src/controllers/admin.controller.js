const Admin = require('../models/Admin');
const Order = require('../models/Order');
const Customer = require('../models/Customer');
const GuestCustomer = require('../models/GuestCustomer');
const Product = require('../models/Product');
const Category = require('../models/Category');

// Get dashboard statistics
exports.getDashboardStats = async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments();
    const [registeredCustomers, guestCustomers] = await Promise.all([
      Customer.countDocuments(),
      GuestCustomer.countDocuments()
    ]);
    const totalCustomers = registeredCustomers + guestCustomers;
    const totalProducts = await Product.countDocuments();
    const totalCategories = await Category.countDocuments();

    // Calculate total revenue
    const revenueData = await Order.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    const totalRevenue = revenueData[0]?.total || 0;

    // Get recent orders
    const recentOrders = await Order.find()
      .populate('customerId', 'name email')
      .populate('guestCustomerId', 'fullName phone')
      .sort({ createdAt: -1 })
      .limit(4);

    // Get top products
    const topProducts = await Product.find()
      .sort({ totalSales: -1 })
      .limit(4);

    res.json({
      success: true,
      stats: {
        totalRevenue,
        totalOrders,
        totalProducts,
        totalCustomers,
        totalCategories
      },
      recentOrders,
      topProducts
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// List all admins
exports.listAdmins = async (req, res) => {
  try {
    const admins = await Admin.find().select('-password');
    res.json({ success: true, admins });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get admin by ID
exports.getAdminById = async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id).select('-password');
    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }
    res.json({ success: true, admin });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update admin
exports.updateAdmin = async (req, res) => {
  try {
    const { name, email, role, isActive } = req.body;
    
    const admin = await Admin.findByIdAndUpdate(
      req.params.id,
      { name, email, role, isActive, updatedAt: new Date() },
      { new: true }
    ).select('-password');

    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    res.json({ success: true, admin });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete admin
exports.deleteAdmin = async (req, res) => {
  try {
    const admin = await Admin.findByIdAndDelete(req.params.id);
    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }
    res.json({ success: true, message: 'Admin deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
