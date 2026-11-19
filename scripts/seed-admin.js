const mongoose = require('mongoose');
const Admin = require('../src/models/Admin');
const { hashPassword } = require('../src/utils/helpers');
require('dotenv').config();

const seedAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/khaity');
    console.log('Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email: 'admin@khaity.com' });
    if (existingAdmin) {
      console.log('Admin user already exists');
      process.exit(0);
    }

    // Create default admin
    const hashedPassword = await hashPassword('admin123');
    const admin = new Admin({
      name: 'Admin User',
      email: 'admin@khaity.com',
      password: hashedPassword,
      role: 'super_admin',
      isActive: true,
    });

    await admin.save();
    console.log('✓ Admin user created successfully');
    console.log('Email: admin@khaity.com');
    console.log('Password: admin123');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding admin:', error);
    process.exit(1);
  }
};

seedAdmin();
