const Admin = require('../models/Admin');
const { generateToken, generateRefreshToken, hashPassword, comparePassword, getRefreshTokenExpiry } = require('../utils/helpers');
const jwt = require('jsonwebtoken');

// Admin Login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find admin by email
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isValidPassword = await comparePassword(password, admin.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    admin.lastLogin = new Date();

    // Generate access token and refresh token
    const accessToken = generateToken(admin);
    const refreshToken = generateRefreshToken(admin);

    // Store hashed refresh token in database
    const hashedRefreshToken = require('bcryptjs').hashSync(refreshToken, 10);
    admin.refreshTokenHash = hashedRefreshToken;
    admin.refreshTokenExpiry = getRefreshTokenExpiry();

    await admin.save();

    res.json({
      success: true,
      accessToken,
      refreshToken,
      user: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        avatar: admin.avatar
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Register Admin (Super admin only)
exports.register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create new admin
    const admin = new Admin({
      name,
      email,
      password: hashedPassword,
      role: role || 'admin'
    });

    await admin.save();

    // Generate access token and refresh token
    const accessToken = generateToken(admin);
    const refreshToken = generateRefreshToken(admin);

    // Store hashed refresh token in database
    const hashedRefreshToken = require('bcryptjs').hashSync(refreshToken, 10);
    admin.refreshTokenHash = hashedRefreshToken;
    admin.refreshTokenExpiry = getRefreshTokenExpiry();

    await admin.save();

    res.status(201).json({
      success: true,
      accessToken,
      refreshToken,
      user: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get current admin profile
exports.getProfile = async (req, res) => {
  try {
    const admin = await Admin.findById(req.user.id).select('-password');
    res.json({ success: true, admin });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Refresh Access Token
exports.refreshAccessToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET || 'refresh-secret-key');
    } catch (error) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    // Find admin
    const admin = await Admin.findById(decoded.id);
    if (!admin) {
      return res.status(401).json({ error: 'Admin not found' });
    }

    // Check if refresh token is expired or no longer valid
    if (!admin.refreshTokenHash || !admin.refreshTokenExpiry || new Date() > new Date(admin.refreshTokenExpiry)) {
      return res.status(401).json({ error: 'Refresh token expired. Please login again' });
    }

    // Verify the refresh token matches the stored hash
    const bcrypt = require('bcryptjs');
    const isValidRefreshToken = bcrypt.compareSync(refreshToken, admin.refreshTokenHash);
    if (!isValidRefreshToken) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    // Generate new access token
    const newAccessToken = generateToken(admin);

    res.json({
      success: true,
      accessToken: newAccessToken
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Logout - Invalidate refresh token
exports.logout = async (req, res) => {
  try {
    const adminId = req.user.id;

    // Clear refresh token from database
    await Admin.findByIdAndUpdate(adminId, {
      refreshTokenHash: null,
      refreshTokenExpiry: null
    });

    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
