const OFFICIAL_PUBLIC_ORIGIN = 'https://www.kimudigital.com';

function publicAppOrigin(env = process.env) {
  const configured = env.NODE_ENV === 'production'
    ? OFFICIAL_PUBLIC_ORIGIN
    : env.PUBLIC_APP_URL || env.CLIENT_URL || 'http://localhost:5173';
  if (!configured) throw Object.assign(new Error('PUBLIC_APP_URL must be configured in production.'), { status: 500 });
  try { return new URL(configured).origin; } catch { throw Object.assign(new Error('PUBLIC_APP_URL must be a valid public application URL.'), { status: 500 }); }
}

module.exports = publicAppOrigin;