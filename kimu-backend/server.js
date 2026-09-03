require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 5000;

async function start() {
  await connectDB();

  const server = app.listen(PORT, () => {
    console.log(`[server] Kimu Transport API running on http://localhost:${PORT}`);
    console.log(`[server] Environment: ${process.env.NODE_ENV || 'development'}`);
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`[server] Port ${PORT} is already in use. Stop the existing backend or set a different PORT.`);
    } else {
      console.error('[server] Failed to start:', error.message);
    }
    process.exit(1);
  });
}

start().catch((error) => {
  console.error('[server] Startup failed:', error.message);
  process.exit(1);
});
