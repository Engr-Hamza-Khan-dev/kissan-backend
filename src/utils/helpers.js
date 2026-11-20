const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Token expiry times from environment or defaults
const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || '15m';
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || '7d';

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role,
      name: user.name
    },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
};

const generateRefreshToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      tokenVersion: user.tokenVersion || 0
    },
    process.env.REFRESH_TOKEN_SECRET || 'refresh-secret-key',
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );
};

const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

const comparePassword = async (password, hashedPassword) => {
  return bcrypt.compare(password, hashedPassword);
};

// Generate human-readable order number: KHT-2026-000125
const generateOrderNumber = (counter) => {
  const year = new Date().getFullYear();
  const paddedCounter = String(counter).padStart(6, '0');
  return `KHT-${year}-${paddedCounter}`;
};

const generateOrderId = () => {
  return `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
};

const generateIdempotencyKey = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

const generateVendorOrderId = (vendorId, counter) => {
  return `VOD-${vendorId.toString().slice(-6)}-${String(counter).padStart(5, '0')}`;
};

const normalizePhoneNumber = (phone) => {
  // Convert Pakistan numbers to international format
  // 03001234567 -> +923001234567
  // 3001234567 -> +923001234567
  if (!phone) return null;
  
  let cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = '92' + cleaned.substring(1);
  } else if (cleaned.length === 10) {
    cleaned = '92' + cleaned;
  } else if (!cleaned.startsWith('92')) {
    return null;
  }
  
  return '+' + cleaned;
};

const generateWhatsAppURL = (phoneNumber, message) => {
  const normalizedPhone = normalizePhoneNumber(phoneNumber);
  if (!normalizedPhone) return null;
  
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${normalizedPhone.substring(1)}?text=${encodedMessage}`;
};

const generateVerificationMessage = (customerName, orderNumber, orderTotal) => {
  return `Assalam-o-Alaikum ${customerName},

Thank you for ordering from Khaity!

We have received your order ${orderNumber} for PKR ${orderTotal.toLocaleString('en-PK')}.

We would like to confirm your order and delivery details before processing it.

Please confirm whether you would like us to proceed with your order.

Thank you,
Khaity Team`;
};

const formatResponse = (success, data, message = '') => {
  return {
    success,
    data,
    message
  };
};

const calculateSubtotal = (items) => {
  return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
};

const getRefreshTokenExpiry = () => {
  // Parse REFRESH_TOKEN_EXPIRY to get number of days
  // Default is 7 days if using '7d' format
  const expiryMatch = REFRESH_TOKEN_EXPIRY.match(/^(\d+)d$/);
  const days = expiryMatch ? parseInt(expiryMatch[1]) : 7;
  
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + days);
  return expiryDate;
};

module.exports = {
  generateToken,
  generateRefreshToken,
  hashPassword,
  comparePassword,
  generateOrderNumber,
  generateOrderId,
  generateIdempotencyKey,
  generateVendorOrderId,
  normalizePhoneNumber,
  generateWhatsAppURL,
  generateVerificationMessage,
  formatResponse,
  calculateSubtotal,
  getRefreshTokenExpiry
};
