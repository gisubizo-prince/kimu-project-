require('dotenv').config();

const connectDB = require('../config/db');
const User = require('../models/User');
const mongoose = require('mongoose');

async function checkAdmin() {
  try {
    await connectDB();

    const email = (process.env.SEED_ADMIN_EMAIL || '').toLowerCase();
    const password = process.env.SEED_ADMIN_PASSWORD;

    const user = await User.findOne({ email }).select('+password');

    console.log('\n--- ADMIN LOGIN DIAGNOSTIC ---');
    console.log('Admin account exists:', !!user);

    if (user) {
      console.log('Account active:', user.isActive);
      console.log('Password matches .env:', await user.comparePassword(password));
      console.log('Role:', user.role);
    }

    console.log('------------------------------\n');
  } catch (error) {
    console.log('Diagnostic error:', error.message);
  } finally {
    await mongoose.connection.close();
  }
}

checkAdmin();