const mongoose = require('mongoose');

const createDBConnection = (dbName, uri) => {
  const connection = mongoose.createConnection(uri || process.env.DB_MONGO, {
    serverSelectionTimeoutMS: 5000,
    maxPoolSize: 10,
  });

  connection.on('connected', () => {
    console.log(`MongoDB connected: ${dbName}`);
  });

  connection.on('error', (error) => {
    console.error(`MongoDB connection error for ${dbName}:`, error);
  });

  connection.on('disconnected', () => {
    console.log(`MongoDB disconnected: ${dbName}`);
  });

  return connection;
};

module.exports = { createDBConnection };
