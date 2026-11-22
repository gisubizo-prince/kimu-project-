require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');
const mongoose = require('mongoose');
const { validateProductionEnv } = require('./config/validateProductionEnv');
const certificateStorage = require('./services/certificateStorage');

const PORT = process.env.PORT || 5000;

async function start() {
  validateProductionEnv();
  if (process.env.NODE_ENV === 'production') await certificateStorage.ensureStorageRoot();
  await connectDB();

  const server = app.listen(PORT, () => {
    console.log(`[server] Kimu API listening on port ${PORT}`);
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

  let shuttingDown = false;
  const shutdown = (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`[server] ${signal} received; draining requests.`);
    const timeout = setTimeout(() => process.exit(1), 15000);
    timeout.unref();
    server.close(async (error) => {
      try { await mongoose.disconnect(); }
      catch (disconnectError) { console.error('[server] MongoDB shutdown failed:', disconnectError.name); }
      clearTimeout(timeout);
      if (error) {
        console.error('[server] HTTP shutdown failed:', error.code || error.name);
        process.exitCode = 1;
      }
    });
  };
  process.once('SIGTERM', () => shutdown('SIGTERM'));
  process.once('SIGINT', () => shutdown('SIGINT'));
}

start().catch((error) => {
  console.error('[server] Startup failed:', error.message);
  process.exit(1);
});
