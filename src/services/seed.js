const Admin = require('../models/Admin');
const Category = require('../models/Category');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const Order = require('../models/Order');
const { hashPassword } = require('../utils/helpers');
const { generateOrderId } = require('../utils/helpers');

const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seeding...');

    // Clear existing data
    await Admin.deleteMany({});
    await Category.deleteMany({});
    await Product.deleteMany({});
    await Customer.deleteMany({});
    await Order.deleteMany({});

    // Create admin
    const hashedPassword = await hashPassword('admin123');
    const admin = await Admin.create({
      name: 'Admin User',
      email: 'admin@khaity.com',
      password: hashedPassword,
      role: 'super_admin'
    });
    console.log('✅ Admin created');

    // Create categories
    const categories = await Category.insertMany([
      {
        name: 'Dairy Cattle',
        description: 'High-quality dairy cattle breeds',
        productCount: 0
      },
      {
        name: 'Feed & Supplements',
        description: 'Premium animal feed and supplements',
        productCount: 0
      },
      {
        name: 'Veterinary Medicine',
        description: 'Medicines and health products',
        productCount: 0
      },
      {
        name: 'Equipment & Housing',
        description: 'Livestock equipment and housing solutions',
        productCount: 0
      }
    ]);
    console.log('✅ Categories created');

    // Create products
    const products = await Product.insertMany([
      {
        name: 'Premium Dairy Feed',
        description: 'High-quality dairy cattle feed',
        price: 2450,
        categoryId: categories[1]._id,
        stock: 100,
        totalSales: 524
      },
      {
        name: 'Veterinary Kit',
        description: 'Complete veterinary care kit',
        price: 2400,
        categoryId: categories[2]._id,
        stock: 50,
        totalSales: 412
      },
      {
        name: 'Cattle Supplements',
        description: 'Essential cattle supplements',
        price: 890,
        categoryId: categories[1]._id,
        stock: 150,
        totalSales: 389
      },
      {
        name: 'Animal Housing',
        description: 'Modern animal housing solutions',
        price: 3500,
        categoryId: categories[3]._id,
        stock: 20,
        totalSales: 267
      },
      {
        name: 'Jersey Dairy Cow',
        description: 'Premium Jersey dairy cattle',
        price: 5000,
        categoryId: categories[0]._id,
        stock: 10,
        totalSales: 45
      }
    ]);
    console.log('✅ Products created');

    // Create customers
    const customers = await Customer.insertMany([
      {
        name: 'Ahmed Hassan',
        email: 'ahmed@example.com',
        phone: '+92300123456',
        address: '123 Farm Road',
        city: 'Lahore',
        province: 'Punjab',
        totalOrders: 5,
        totalSpent: 12450
      },
      {
        name: 'Fatima Khan',
        email: 'fatima@example.com',
        phone: '+92300654321',
        address: '456 Village Road',
        city: 'Islamabad',
        province: 'Federal',
        totalOrders: 3,
        totalSpent: 8900
      },
      {
        name: 'Mohammed Ali',
        email: 'ali@example.com',
        phone: '+92301234567',
        address: '789 Country Lane',
        city: 'Karachi',
        province: 'Sindh',
        totalOrders: 8,
        totalSpent: 24500
      },
      {
        name: 'Aisha Ibrahim',
        email: 'aisha@example.com',
        phone: '+92310987654',
        address: '321 Agricultural Area',
        city: 'Faisalabad',
        province: 'Punjab',
        totalOrders: 2,
        totalSpent: 7200
      }
    ]);
    console.log('✅ Customers created');

    // Create orders
    await Order.insertMany([
      {
        orderId: generateOrderId(),
        customerId: customers[0]._id,
        items: [
          {
            productId: products[0]._id,
            productName: 'Premium Dairy Feed',
            quantity: 1,
            price: 2450,
            subtotal: 2450
          }
        ],
        subtotal: 2450,
        totalAmount: 2450,
        orderStatus: 'DELIVERED',
        paymentMethod: 'COD',
        paymentStatus: 'PAID',
        deliveryAddress: {
          address: '123 Farm Road',
          city: 'Lahore',
          province: 'Punjab'
        }
      },
      {
        orderId: generateOrderId(),
        customerId: customers[1]._id,
        items: [
          {
            productId: products[2]._id,
            productName: 'Cattle Supplements',
            quantity: 1,
            price: 890,
            subtotal: 890
          }
        ],
        subtotal: 890,
        totalAmount: 890,
        orderStatus: 'PENDING_VERIFICATION',
        paymentMethod: 'COD',
        paymentStatus: 'PENDING',
        deliveryAddress: {
          address: '456 Village Road',
          city: 'Islamabad',
          province: 'Federal'
        }
      },
      {
        orderId: generateOrderId(),
        customerId: customers[2]._id,
        items: [
          {
            productId: products[1]._id,
            productName: 'Veterinary Kit',
            quantity: 1,
            price: 2400,
            subtotal: 2400
          }
        ],
        subtotal: 2400,
        totalAmount: 2400,
        orderStatus: 'DELIVERED',
        paymentMethod: 'ONLINE_PAYMENT',
        paymentStatus: 'PAID',
        deliveryAddress: {
          address: '789 Country Lane',
          city: 'Karachi',
          province: 'Sindh'
        }
      },
      {
        orderId: generateOrderId(),
        customerId: customers[3]._id,
        items: [
          {
            productId: products[3]._id,
            productName: 'Animal Housing',
            quantity: 1,
            price: 3500,
            subtotal: 3500
          }
        ],
        subtotal: 3500,
        totalAmount: 3500,
        orderStatus: 'PROCESSING',
        paymentMethod: 'COD',
        paymentStatus: 'PENDING',
        deliveryAddress: {
          address: '321 Agricultural Area',
          city: 'Faisalabad',
          province: 'Punjab'
        }
      }
    ]);
    console.log('✅ Orders created');

    console.log('🎉 Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Seeding error:', error.message);
    process.exit(1);
  }
};

module.exports = seedDatabase;
