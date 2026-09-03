const jwt = require('jsonwebtoken');

/**
 * Signs a JWT containing the user's id and role.
 * Expiry is controlled by JWT_EXPIRES_IN (defaults to 7 days).
 */
function generateToken(user) {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

module.exports = generateToken;
