const User = require('../models/User');
const generateToken = require('../utils/generateToken');

/**
 * POST /api/auth/login
 * Public. Authenticates a user and returns a JWT + safe user object.
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
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

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ success: false, message: 'A user with that email already exists.' });
    }

    const user = await User.create({ fullName, email, password, role, phone });

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

module.exports = { login, register, getMe, logout };
