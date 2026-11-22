const jwt = require('jsonwebtoken');

/**
 * Signs a JWT containing the user's id and role.
 * Production configuration is validated at startup. Development keeps a
 * seven-day default for local workflows; production must set a short expiry.
 */
function generateToken(user) {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    {
      algorithm: 'HS256',
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      issuer: process.env.JWT_ISSUER || 'kimu-api',
      audience: process.env.JWT_AUDIENCE || 'kimu-client',
    }
  );
}

module.exports = generateToken;
