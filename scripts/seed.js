const mongoose = require('mongoose');
require('dotenv').config();

const seedDatabase = require('../src/services/seed');

const main = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    await seedDatabase();

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

main();
