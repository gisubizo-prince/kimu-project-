const PLACEHOLDERS = new Set(['change_this_to_a_long_random_string', 'changeme123!', 'secret', 'your-secret']);
const path = require('path');

function isHttpsOrigin(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' && parsed.origin === value.replace(/\/$/, '') && !['localhost', '127.0.0.1'].includes(parsed.hostname);
  } catch { return false; }
}

function validateProductionEnv(env = process.env) {
  if (env.NODE_ENV !== 'production') return;
  const problems = [];
  if (!env.JWT_SECRET || env.JWT_SECRET.length < 32 || PLACEHOLDERS.has(env.JWT_SECRET.toLowerCase()) || /^(replace|change|example|placeholder)/i.test(env.JWT_SECRET)) problems.push('JWT_SECRET must be a unique random value of at least 32 characters');
  if (!env.MONGO_URI || !/^mongodb(?:\+srv)?:\/\//.test(env.MONGO_URI)) problems.push('MONGO_URI must be configured');
  else if (!/^mongodb\+srv:\/\//.test(env.MONGO_URI) && !/[?&]tls=true(?:&|$)/i.test(env.MONGO_URI)) problems.push('MONGO_URI must use TLS in production');
  if (!isHttpsOrigin(env.CLIENT_URL)) problems.push('CLIENT_URL must be a public HTTPS origin');
  if (!isHttpsOrigin(env.PUBLIC_APP_URL)) problems.push('PUBLIC_APP_URL must be a public HTTPS origin');
  if (!env.CERTIFICATE_STORAGE_DIR || !path.isAbsolute(env.CERTIFICATE_STORAGE_DIR)) problems.push('CERTIFICATE_STORAGE_DIR must be an absolute private persistent path');
  if (!/^(?:0|[1-9]\d*)$/.test(env.TRUST_PROXY_HOPS || '')) problems.push('TRUST_PROXY_HOPS must be set to the exact trusted proxy hop count');
  if (!env.JWT_EXPIRES_IN || !/^\d+(?:s|m|h|d)$/.test(env.JWT_EXPIRES_IN)) problems.push('JWT_EXPIRES_IN must be explicitly set (for example 15m)');
  else {
    const [, raw, unit] = env.JWT_EXPIRES_IN.match(/^(\d+)(s|m|h|d)$/);
    const seconds = Number(raw) * ({ s: 1, m: 60, h: 3600, d: 86400 })[unit];
    if (seconds < 60 || seconds > 86400) problems.push('JWT_EXPIRES_IN must be between 1 minute and 24 hours');
  }
  if (problems.length) throw new Error(`Invalid production configuration: ${problems.join('; ')}`);
}

module.exports = { validateProductionEnv, isHttpsOrigin };
