import { loadEnv } from 'vite';

const env = loadEnv('production', process.cwd(), 'VITE_');
let apiUrl;
try { apiUrl = new URL(env.VITE_API_URL); } catch { throw new Error('VITE_API_URL must be set to the public HTTPS API base for production builds.'); }
if (apiUrl.protocol !== 'https:' || ['localhost', '127.0.0.1'].includes(apiUrl.hostname)) {
  throw new Error('VITE_API_URL must use a public HTTPS host in production.');
}
if (!apiUrl.pathname.replace(/\/$/, '').endsWith('/api')) {
  throw new Error('VITE_API_URL must include the /api base path.');
}
if (apiUrl.username || apiUrl.password || apiUrl.search || apiUrl.hash) {
  throw new Error('VITE_API_URL must not include credentials, a query, or a fragment.');
}
