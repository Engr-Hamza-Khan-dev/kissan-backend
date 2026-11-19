const Order = require('../models/Order');
const Customer = require('../models/Customer');
const GuestCustomer = require('../models/GuestCustomer');
const Product = require('../models/Product');
const Vendor = require('../models/Vendor');
const VendorOrder = require('../models/VendorOrder');
const Payment = require('../models/Payment');
const OrderStatusHistory = require('../models/OrderStatusHistory');
const OrderVerification = require('../models/OrderVerification');
const OrderContactLog = require('../models/OrderContactLog');
const { 
  generateOrderNumber, 
  generateIdempotencyKey,
  generateVendorOrderId,
  calculateSubtotal 
} = require('../utils/helpers');
const mongoose = require('mongoose');

// ============ CREATE ORDER (Guest or Customer) ============
// POST /api/orders/create
exports.createGuestOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      customerInfo,
      items,
      deliveryAddress,
      paymentMethod,
      deliveryCharges = 0,
      discount = 0,
      idempotencyKey
    } = req.body;

    // Validation
    if (!customerInfo || !items || items.length === 0 || !deliveryAddress) {
      return res.status(400).json({ 
        error: 'Missing required fields: customerInfo, items, deliveryAddress' 
      });
    }

    const hasInvalidProductId = !Array.isArray(items) || items.some(
      (item) => !item || typeof item.productId !== 'string' || !/^[a-f\d]{24}$/i.test(item.productId)
    );
    if (hasInvalidProductId) {
      await session.abortTransaction();
      return res.status(400).json({
        error: 'Each order item must include a valid MongoDB product ID'
      });
    }

    if (!['COD', 'ONLINE_PAYMENT'].includes(paymentMethod)) {
      return res.status(400).json({ error: 'Invalid payment method' });
    }

    // Idempotency check
    if (idempotencyKey) {
      const existingOrder = await Order.findOne({ idempotencyKey }).session(session);
      if (existingOrder) {
        await session.abortTransaction();
        return res.status(409).json({ 
          success: true, 
          order: existingOrder,
          message: 'Order already created with this idempotency key'
        });
      }
    }

    // Validate products and fetch prices from DB (never trust client prices)
    const enrichedItems = [];
    let calculatedSubtotal = 0;

    for (const item of items) {
      const product = await Product.findById(item.productId).session(session);
      
      if (!product) {
        await session.abortTransaction();
        return res.status(404).json({ 
          error: `Product not found: ${item.productId}` 
        });
      }

      // Check stock
      if (product.stock < item.quantity) {
        await session.abortTransaction();
        return res.status(400).json({ 
          error: `Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}` 
        });
      }

      const subtotal = product.price * item.quantity;
      calculatedSubtotal += subtotal;

      enrichedItems.push({
        productId: product._id,
        vendorId: product.vendorId || null,
        productName: product.name,
        quantity: item.quantity,
        price: product.price,
        subtotal: subtotal,
        images: product.images || []
      });

      // Decrement stock
      await Product.findByIdAndUpdate(
        product._id,
        { $inc: { stock: -item.quantity, totalSales: item.quantity } },
        { session }
      );
    }

    // Calculate totals (server-side only)
    const subtotal = calculatedSubtotal;
    const totalAmount = subtotal + deliveryCharges - discount;

    if (totalAmount <= 0) {
      await session.abortTransaction();
      return res.status(400).json({ error: 'Total amount must be greater than 0' });
    }

    // Get next order number (using counter pattern in production)
    const lastOrder = await Order.findOne().sort({ createdAt: -1 }).session(session);
    const counter = lastOrder ? parseInt(lastOrder.orderId.split('-')[2]) + 1 : 1;
    const orderId = generateOrderNumber(counter);

    // Handle customer (registered or guest)
    let customerId = null;
    let guestCustomerId = null;
    let isGuest = false;

    if (req.user?.id) {
      // Authenticated customer
      customerId = req.user.id;
    } else {
      // Guest customer - check if exists by phone
      let guestCustomer = await GuestCustomer.findOne({
        phone: customerInfo.phone
      }).session(session);
      const guestOrderDate = new Date();

      if (!guestCustomer) {
        guestCustomer = new GuestCustomer({
          fullName: customerInfo.fullName,
          phone: customerInfo.phone,
          whatsappNumber: customerInfo.whatsappNumber,
          email: customerInfo.email,
          customerType: customerInfo.customerType || 'individual',
          deliveryAddress,
          orderCount: 1,
          totalSpent: totalAmount,
          lastOrderDate: guestOrderDate
        });
        await guestCustomer.save({ session });
      } else {
        guestCustomer.fullName = customerInfo.fullName;
        guestCustomer.whatsappNumber = customerInfo.whatsappNumber;
        guestCustomer.email = customerInfo.email;
        guestCustomer.customerType = customerInfo.customerType || 'individual';
        guestCustomer.deliveryAddress = deliveryAddress;
        guestCustomer.orderCount += 1;
        guestCustomer.totalSpent += totalAmount;
        guestCustomer.lastOrderDate = guestOrderDate;
        guestCustomer.updatedAt = guestOrderDate;
        await guestCustomer.save({ session });
      }

      guestCustomerId = guestCustomer._id;
      isGuest = true;
    }

    // Create order
    const order = new Order({
      orderId,
      customerId,
      guestCustomerId,
      isGuest,
      customerInfo: {
        fullName: customerInfo.fullName,
        phone: customerInfo.phone,
        whatsappNumber: customerInfo.whatsappNumber,
        email: customerInfo.email,
        customerType: customerInfo.customerType || 'individual'
      },
      items: enrichedItems,
      deliveryAddress,
      deliveryCharges,
      discount,
      subtotal,
      totalAmount,
      paymentMethod,
      paymentStatus: paymentMethod === 'COD' ? 'PENDING' : 'PENDING',
      orderStatus: 'PENDING_VERIFICATION',
      idempotencyKey: idempotencyKey || generateIdempotencyKey()
    });

    await order.save({ session });

    // Create initial order status history
    const statusHistory = new OrderStatusHistory({
      orderId: order._id,
      statusType: 'ORDER_STATUS',
      newStatus: 'PENDING_VERIFICATION',
      systemTriggered: true
    });
    await statusHistory.save({ session });

    // Create verification record
    const verification = new OrderVerification({
      orderId: order._id,
      status: 'PENDING'
    });
    await verification.save({ session });

    // Create payment record
    const payment = new Payment({
      orderId: order._id,
      amount: totalAmount,
      paymentMethod,
      status: 'PENDING'
    });
    await payment.save({ session });

    // Create vendor orders for multi-vendor cart
    const vendorMap = {};
    for (const item of enrichedItems) {
      if (item.vendorId) {
        if (!vendorMap[item.vendorId]) {
          vendorMap[item.vendorId] = [];
        }
        vendorMap[item.vendorId].push(item);
      }
    }

    for (const [vendorId, vendorItems] of Object.entries(vendorMap)) {
      const vendorSubtotal = vendorItems.reduce((sum, item) => sum + item.subtotal, 0);
      const vendor = await Vendor.findById(vendorId).session(session);
      const commission = (vendor?.commissionRate || 0) * vendorSubtotal / 100;
      const vendorEarnings = vendorSubtotal - commission;

      const vendorOrder = new VendorOrder({
        parentOrderId: order._id,
        vendorId: new mongoose.Types.ObjectId(vendorId),
        vendorOrderId: generateVendorOrderId(vendorId, 1),
        items: vendorItems,
        subtotal: vendorSubtotal,
        commission,
        vendorEarnings,
        status: 'PENDING',
        shippingAddress: deliveryAddress
      });
      await vendorOrder.save({ session });
    }

    await session.commitTransaction();

    return res.status(201).json({
      success: true,
      order: {
        _id: order._id,
        orderId: order.orderId,
        orderNumber: order.orderId,
        totalAmount: order.totalAmount,
        paymentStatus: order.paymentStatus,
        orderStatus: order.orderStatus,
        createdAt: order.createdAt
      },
      message: 'Order created successfully'
    });

  } catch (error) {
    await session.abortTransaction();
    console.error('Order creation error:', error);
    res.status(500).json({ error: error.message });
  } finally {
    session.endSession();
  }
};

// ============ GET ALL ORDERS (Admin) ============
// GET /api/orders
exports.getAllOrders = async (req, res) => {
  try {
    const {
      orderStatus,
      paymentStatus,
      verificationStatus,
      paymentMethod,
      startDate,
      endDate,
      search,
      page = 1,
      limit = 10
    } = req.query;

    const skip = (page - 1) * limit;
    const filter = {};

    // Filters
    if (orderStatus) filter.orderStatus = orderStatus;
    if (paymentStatus) filter.paymentStatus = paymentStatus;
    if (verificationStatus) filter.verificationStatus = verificationStatus;
    if (paymentMethod) filter.paymentMethod = paymentMethod;

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    if (search) {
      filter.$or = [
        { orderId: new RegExp(search, 'i') },
        { 'customerInfo.fullName': new RegExp(search, 'i') },
        { 'customerInfo.phone': new RegExp(search, 'i') }
      ];
    }

    const orders = await Order.find(filter)
      .populate('customerId', 'name email phone')
      .populate('guestCustomerId', 'fullName phone email')
      .populate('verifiedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Order.countDocuments(filter);

    res.json({
      success: true,
      orders,
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

// ============ GET ORDER BY ID (Admin) ============
// GET /api/orders/:id
exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('customerId', 'name email phone address city province')
      .populate('guestCustomerId', 'fullName phone whatsappNumber email')
      .populate('verifiedBy', 'name email')
      .populate('items.productId', 'name description price images')
      .populate('items.vendorId', 'storeName');

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Get order timeline
    const statusHistory = await OrderStatusHistory.find({ orderId: order._id })
      .populate('changedBy', 'name email')
      .sort({ createdAt: 1 });

    // Get contact logs
    const contactLogs = await OrderContactLog.find({ orderId: order._id })
      .populate('initiatedBy', 'name email')
      .sort({ createdAt: -1 });

    // Get verification info
    const verification = await OrderVerification.findOne({ orderId: order._id })
      .populate('verifiedBy', 'name email');

    // Get payment info
    const payment = await Payment.findOne({ orderId: order._id });

    // Get vendor orders
    const vendorOrders = await VendorOrder.find({ parentOrderId: order._id })
      .populate('vendorId', 'storeName email phone');

    res.json({
      success: true,
      order: order.toObject(),
      timeline: statusHistory,
      contactLogs,
      verification,
      payment,
      vendorOrders
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ============ UPDATE ORDER STATUS ============
// PUT /api/orders/:id/status
exports.updateOrderStatus = async (req, res) => {
  try {
    const { newOrderStatus, reason, notes } = req.body;

    if (!newOrderStatus) {
      return res.status(400).json({ error: 'newOrderStatus is required' });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      {
        orderStatus: newOrderStatus,
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Record status change
    const history = new OrderStatusHistory({
      orderId: order._id,
      statusType: 'ORDER_STATUS',
      newStatus: newOrderStatus,
      changedBy: req.user?.id,
      reason,
      notes
    });
    await history.save();

    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ============ UPDATE PAYMENT STATUS ============
// PUT /api/orders/:id/payment
exports.updatePaymentStatus = async (req, res) => {
  try {
    const { paymentStatus, transactionReference, notes } = req.body;

    if (!paymentStatus) {
      return res.status(400).json({ error: 'paymentStatus is required' });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      {
        paymentStatus,
        paymentReference: transactionReference,
        paymentDate: paymentStatus === 'PAID' ? new Date() : undefined,
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Update payment record
    await Payment.findOneAndUpdate(
      { orderId: order._id },
      {
        status: paymentStatus === 'PAID' ? 'SUCCESS' : paymentStatus,
        paymentDate: paymentStatus === 'PAID' ? new Date() : undefined
      }
    );

    // Record status change
    const history = new OrderStatusHistory({
      orderId: order._id,
      statusType: 'PAYMENT_STATUS',
      newStatus: paymentStatus,
      changedBy: req.user?.id,
      notes
    });
    await history.save();

    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ============ VERIFY ORDER ============
// PUT /api/orders/:id/verify
exports.verifyOrder = async (req, res) => {
  try {
    const { verificationMethod, notes } = req.body;

    if (!verificationMethod) {
      return res.status(400).json({ error: 'verificationMethod is required' });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      {
        verificationStatus: 'VERIFIED',
        verificationMethod,
        verificationDate: new Date(),
        verifiedBy: req.user?.id,
        verificationNotes: notes,
        orderStatus: 'CONFIRMED',
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Update verification record
    await OrderVerification.findOneAndUpdate(
      { orderId: order._id },
      {
        status: 'VERIFIED',
        method: verificationMethod,
        verificationDate: new Date(),
        verifiedBy: req.user?.id,
        notes
      }
    );

    // Record status changes
    await OrderStatusHistory.create([
      {
        orderId: order._id,
        statusType: 'VERIFICATION_STATUS',
        newStatus: 'VERIFIED',
        changedBy: req.user?.id,
        notes
      },
      {
        orderId: order._id,
        statusType: 'ORDER_STATUS',
        previousStatus: 'PENDING_VERIFICATION',
        newStatus: 'CONFIRMED',
        changedBy: req.user?.id
      }
    ]);

    res.json({ success: true, order, message: 'Order verified and confirmed' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ============ MARK ORDER AS UNABLE TO CONTACT ============
// PUT /api/orders/:id/unable-to-contact
exports.markUnableToContact = async (req, res) => {
  try {
    const { notes } = req.body;

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      {
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Update verification record
    await OrderVerification.findOneAndUpdate(
      { orderId: order._id },
      {
        status: 'UNABLE_TO_CONTACT',
        contactAttempts: { $inc: 1 },
        lastContactAttempt: new Date(),
        notes
      },
      { new: true }
    );

    res.json({ success: true, order, message: 'Order marked as unable to contact' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ============ REJECT ORDER ============
// PUT /api/orders/:id/reject
exports.rejectOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      {
        orderStatus: 'REJECTED',
        verificationStatus: 'FAILED',
        updatedAt: new Date()
      },
      { new: true, session }
    );

    if (!order) {
      await session.abortTransaction();
      return res.status(404).json({ error: 'Order not found' });
    }

    // Restore stock
    for (const item of order.items) {
      await Product.findByIdAndUpdate(
        item.productId,
        { $inc: { stock: item.quantity, totalSales: -item.quantity } },
        { session }
      );
    }

    // Update verification
    await OrderVerification.findOneAndUpdate(
      { orderId: order._id },
      {
        status: 'FAILED',
        rejectionReason: reason
      },
      { session }
    );

    // Record status changes
    await OrderStatusHistory.create(
      [
        {
          orderId: order._id,
          statusType: 'VERIFICATION_STATUS',
          newStatus: 'FAILED',
          changedBy: req.user?.id,
          reason
        },
        {
          orderId: order._id,
          statusType: 'ORDER_STATUS',
          newStatus: 'REJECTED',
          changedBy: req.user?.id,
          reason
        }
      ],
      { session }
    );

    await session.commitTransaction();

    res.json({ success: true, order, message: 'Order rejected and stock restored' });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ error: error.message });
  } finally {
    session.endSession();
  }
};

// ============ ADD CONTACT LOG ============
// POST /api/orders/:id/contact-log
exports.addContactLog = async (req, res) => {
  try {
    const { contactMethod, contactNumber, message, result, notes, followUpDate } = req.body;

    if (!contactMethod || !contactNumber) {
      return res.status(400).json({ error: 'contactMethod and contactNumber are required' });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const contactLog = new OrderContactLog({
      orderId: order._id,
      contactMethod,
      initiatedBy: req.user?.id,
      contactNumber,
      message,
      result: result || 'PENDING',
      notes,
      followUpDate
    });

    await contactLog.save();

    // Update verification contact attempts
    await OrderVerification.findOneAndUpdate(
      { orderId: order._id },
      {
        contactAttempts: { $inc: 1 },
        lastContactAttempt: new Date()
      }
    );

    res.status(201).json({ success: true, contactLog });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ============ GET ORDER STATUS TIMELINE ============
// GET /api/orders/:id/timeline
exports.getOrderTimeline = async (req, res) => {
  try {
    const timeline = await OrderStatusHistory.find({ orderId: req.params.id })
      .populate('changedBy', 'name email')
      .sort({ createdAt: 1 });

    res.json({ success: true, timeline });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ============ GET CONTACT HISTORY ============
// GET /api/orders/:id/contacts
exports.getContactHistory = async (req, res) => {
  try {
    const contacts = await OrderContactLog.find({ orderId: req.params.id })
      .populate('initiatedBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({ success: true, contacts });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ============ DELETE ORDER ============
// DELETE /api/orders/:id
exports.deleteOrder = async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json({ success: true, message: 'Order deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
