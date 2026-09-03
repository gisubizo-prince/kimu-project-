/**
 * Creates the first super_admin account so you can log in for the first time.
 * Run with: npm run seed:admin
 * Uses SEED_ADMIN_* values from .env. Safe to re-run — it won't duplicate an existing user.
 */
require('dotenv').config();
const connectDB = require('../config/db');
const User = require('../models/User');
const mongoose = require('mongoose');

async function seed() {
  await connectDB();

  const email = (process.env.SEED_ADMIN_EMAIL || '').toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  const fullName = process.env.SEED_ADMIN_NAME || 'System Administrator';

  if (!email || !password) {
    console.error('[seed] SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set in .env');
    process.exit(1);
  }

  const existing = await User.findOne({ email });

  if (existing) {
    console.log(`[seed] Admin account already exists for ${email}. Skipping.`);
  } else {
    await User.create({
      fullName,
      email,
      password,
      role: 'super_admin',
      isActive: true,
    });
    console.log(`[seed] Super admin created: ${email}`);
    console.log('[seed] Log in with this email and the password from your .env, then change it.');
  }

  await mongoose.connection.close();
  process.exit(0);
}

seed().catch((err) => {
  console.error('[seed] Failed:', err.message);
  process.exit(1);
});
