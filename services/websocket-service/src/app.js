const express = require('express');
const cors = require('cors');
const { getConnectedUsers, isUserConnected } = require('./socket');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'websocket-service',
    timestamp: new Date().toISOString()
  });
});

app.get('/connected-users', (req, res) => {
  const users = getConnectedUsers();
  res.json({
    success: true,
    data: {
      count: users.length,
      users
    }
  });
});

app.get('/user-status/:userId', (req, res) => {
  const { userId } = req.params;
  const isConnected = isUserConnected(userId);

  res.json({
    success: true,
    data: {
      userId,
      isConnected
    }
  });
});

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

module.exports = app;
