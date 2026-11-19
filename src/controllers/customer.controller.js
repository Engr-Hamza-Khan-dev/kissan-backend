const Customer = require('../models/Customer');
const GuestCustomer = require('../models/GuestCustomer');
const Order = require('../models/Order');
const mongoose = require('mongoose');

const normalizeGuestCustomer = (customer, orderStats = {}) => ({
  ...customer,
  name: customer.fullName,
  email: customer.email || '',
  address: customer.deliveryAddress?.address || '',
  city: customer.deliveryAddress?.city || '',
  province: customer.deliveryAddress?.province || '',
  postalCode: customer.deliveryAddress?.postalCode || '',
  totalOrders: orderStats.totalOrders ?? customer.orderCount ?? 0,
  totalSpent: orderStats.totalSpent ?? customer.totalSpent ?? 0,
  status: 'active',
  joinedAt: customer.createdAt,
  isGuest: true
});

// Create customer
exports.createCustomer = async (req, res) => {
  try {
    const { name, email, phone, address, city, province } = req.body;

    const customer = new Customer({
      name,
      email,
      phone,
      address,
      city,
      province
    });

    await customer.save();
    res.status(201).json({ success: true, customer });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get all customers
exports.getAllCustomers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status } = req.query;
    const pageNumber = Math.max(1, parseInt(page, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNumber - 1) * pageSize;
    const fetchLimit = skip + pageSize;
    const searchRegex = search
      ? new RegExp(String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
      : null;

    const customerFilter = {};
    if (status) customerFilter.status = status;
    if (searchRegex) {
      customerFilter.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { phone: searchRegex }
      ];
    }

    const guestFilter = {};
    if (searchRegex) {
      guestFilter.$or = [
        { fullName: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
        { 'deliveryAddress.city': searchRegex }
      ];
    }

    const includeGuests = !status || status === 'active';
    const [
      registeredCustomers,
      registeredTotal,
      guestCustomers,
      guestTotal
    ] = await Promise.all([
      Customer.find(customerFilter)
        .sort({ joinedAt: -1 })
        .limit(fetchLimit)
        .lean(),
      Customer.countDocuments(customerFilter),
      includeGuests
        ? GuestCustomer.find(guestFilter)
            .sort({ createdAt: -1 })
            .limit(fetchLimit)
            .lean()
        : Promise.resolve([]),
      includeGuests
        ? GuestCustomer.countDocuments(guestFilter)
        : Promise.resolve(0)
    ]);

    const guestOrderStats = guestCustomers.length
      ? await Order.aggregate([
          { $match: { guestCustomerId: { $in: guestCustomers.map(({ _id }) => _id) } } },
          {
            $group: {
              _id: '$guestCustomerId',
              totalOrders: { $sum: 1 },
              totalSpent: { $sum: '$totalAmount' }
            }
          }
        ])
      : [];
    const guestStatsById = new Map(
      guestOrderStats.map((stats) => [String(stats._id), stats])
    );

    const customers = [
      ...registeredCustomers.map((customer) => ({ ...customer, isGuest: false })),
      ...guestCustomers.map((customer) =>
        normalizeGuestCustomer(customer, guestStatsById.get(String(customer._id)))
      )
    ]
      .sort((a, b) => new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime())
      .slice(skip, skip + pageSize);
    const total = registeredTotal + guestTotal;

    res.json({
      success: true,
      customers,
      pagination: {
        total,
        page: pageNumber,
        pages: Math.ceil(total / pageSize)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get customer by ID
exports.getCustomerById = async (req, res) => {
  try {
    if (!mongoose.isObjectIdOrHexString(req.params.id)) {
      return res.status(400).json({ error: 'Invalid customer ID' });
    }

    const customer = await Customer.findById(req.params.id).lean();

    if (customer) {
      return res.json({
        success: true,
        customer: { ...customer, isGuest: false }
      });
    }

    const guestCustomer = await GuestCustomer.findById(req.params.id).lean();
    if (!guestCustomer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const [orderStats] = await Order.aggregate([
      { $match: { guestCustomerId: guestCustomer._id } },
      {
        $group: {
          _id: '$guestCustomerId',
          totalOrders: { $sum: 1 },
          totalSpent: { $sum: '$totalAmount' }
        }
      }
    ]);

    res.json({
      success: true,
      customer: normalizeGuestCustomer(guestCustomer, orderStats)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update customer
exports.updateCustomer = async (req, res) => {
  try {
    const { name, email, phone, address, city, province, status } = req.body;

    const customer = await Customer.findByIdAndUpdate(
      req.params.id,
      {
        name,
        email,
        phone,
        address,
        city,
        province,
        status,
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json({ success: true, customer });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete customer
exports.deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findByIdAndDelete(req.params.id);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    res.json({ success: true, message: 'Customer deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
