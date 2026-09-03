const mongoose = require('mongoose');

/**
 * Connects to MongoDB using MONGO_URI from environment variables.
 * Exits the process if the connection fails, since the API is useless without a DB.
 */
async function connectDB() {
  try {
    const uri = process.env.MONGO_URI;

    if (!uri) {
      throw new Error('MONGO_URI is not set. Copy .env.example to .env and configure it.');
    }

    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
      socketTimeoutMS: 10000,
    });

    console.log(`[db] MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);

    mongoose.connection.on('error', (err) => {
      console.error('[db] MongoDB connection error:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('[db] MongoDB disconnected');
    });
  } catch (error) {
    console.error(`[db] Failed to connect to MongoDB at ${uri}: ${error.message}`);
    console.error('[db] Start MongoDB on port 27017 or update MONGO_URI in .env.');
    process.exit(1);
  }
}

module.exports = connectDB;
