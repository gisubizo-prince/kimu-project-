const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const generateToken = require('../utils/generateToken');

/**
 * POST /api/auth/login
 * Public. Authenticates a user and returns a JWT + safe user object.
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (typeof email !== 'string' || typeof password !== 'string' || !email || !password || email.length > 254 || password.length > 128) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'This account has been deactivated. Contact an administrator.' });
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    user.lastLoginAt = new Date();
    await user.save();

    const token = generateToken(user);

    res.status(200).json({
      success: true,
      message: 'Login successful.',
      data: {
        token,
        user: user.toSafeObject(),
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/register
 * Protected — super_admin/admin only (wired in routes). Creates a new staff account.
 */
async function register(req, res, next) {
  try {
    const { fullName, email, password, role, phone } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ success: false, message: 'Full name, email, and password are required.' });
    }
    if (typeof fullName !== 'string' || fullName.length > 200 || typeof email !== 'string' || email.length > 254 || !/^\S+@\S+\.\S+$/.test(email) || typeof password !== 'string' || password.length > 128 || (phone !== undefined && (typeof phone !== 'string' || phone.length > 40))) {
      return res.status(400).json({ success: false, message: 'User details are invalid.' });
    }

    if (role !== undefined && !['super_admin', 'admin', 'hr_staff', 'security', 'manager'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role.' });
    }
    if (role === 'super_admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Only a super administrator can assign the super administrator role.' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ success: false, message: 'A user with that email already exists.' });
    }

    const user = await User.create({ fullName, email, password, role, phone });
    if (role === 'super_admin') await AuditLog.create({ user: req.user._id, action: 'assigned super_admin role', entity: 'user', recordId: String(user._id), details: { role } });

    res.status(201).json({
      success: true,
      message: 'User created successfully.',
      data: { user: user.toSafeObject() },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/auth/me
 * Protected. Returns the currently authenticated user.
 */
async function getMe(req, res, next) {
  try {
    res.status(200).json({
      success: true,
      data: { user: req.user.toSafeObject() },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/logout
 * Protected. JWTs are stateless, so logout is enforced client-side by discarding
 * the token; this endpoint exists for a consistent API contract and future
 * server-side session/blacklist support if needed.
 */
async function logout(req, res) {
  res.status(200).json({ success: true, message: 'Logged out successfully.' });
}

async function updateSettings(req, res, next) {
  try {
    const { fullName, phone, profilePhoto, preferences } = req.body;
    if (fullName !== undefined) req.user.fullName = fullName;
    if (phone !== undefined) req.user.phone = phone;
    if (profilePhoto !== undefined) req.user.profilePhoto = profilePhoto;
    if (preferences) req.user.preferences = { ...(req.user.preferences || {}), ...preferences, timezone: 'Africa/Kigali' };
    await req.user.save();
    res.json({ success: true, message: 'Settings saved successfully.', data: { user: req.user.toSafeObject() } });
  } catch (error) { next(error); }
}

async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ success: false, message: 'Current and new passwords are required.' });
    if (newPassword.length < 8) return res.status(400).json({ success: false, message: 'New password must be at least 8 characters.' });
    const user = await User.findById(req.user._id).select('+password');
    if (!(await user.comparePassword(currentPassword))) return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
    user.password = newPassword;
    await user.save();
    res.json({ success: true, message: 'Password changed successfully.' });
  } catch (error) { next(error); }
}

module.exports = { login, register, getMe, logout, updateSettings, changePassword };
