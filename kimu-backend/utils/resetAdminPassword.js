require('dotenv').config();

const connectDB = require('../config/db');
const User = require('../models/User');
const mongoose = require('mongoose');

async function resetPassword() {
  try {
    await connectDB();

    const email = process.env.SEED_ADMIN_EMAIL.toLowerCase();
    const password = process.env.SEED_ADMIN_PASSWORD;

    if (!password || password.length < 8) {
      throw new Error('Password must contain at least 8 characters.');
    }

    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      throw new Error('Administrator account not found.');
    }

    user.password = password;
    await user.save();

    console.log('[success] Administrator password updated.');
  } catch (error) {
    console.error('[error]', error.message);
  } finally {
    await mongoose.connection.close();
  }
}

resetPassword();