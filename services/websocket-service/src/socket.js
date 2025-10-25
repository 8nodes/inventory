const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { createLogger } = require('../../../shared/utils/logger');

const logger = createLogger('websocket-service');
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

const connectedUsers = new Map();
const userRooms = new Map();

function setupSocketIO(server) {
  const io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || '*',
      methods: ['GET', 'POST'],
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token, JWT_SECRET);
      socket.user = decoded;
      next();
    } catch (error) {
      logger.error('Socket authentication error:', error);
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user.userId;
    const userRole = socket.user.role;
    const companyId = socket.user.companyId;

    logger.info(`User connected: ${userId} (${userRole})`);

    connectedUsers.set(userId, {
      socketId: socket.id,
      userId,
      companyId,
      connectedAt: new Date()
    });

    socket.join(`user:${userId}`);

    if (companyId) {
      socket.join(`company:${companyId}`);
    }

    if (socket.user.shopIds && socket.user.shopIds.length > 0) {
      socket.user.shopIds.forEach(shopId => {
        socket.join(`shop:${shopId}`);
      });
    }

    if (userRole === 'super_admin') {
      socket.join('super_admin');
    }

    socket.on('join_chat_room', (roomId) => {
      socket.join(`chat:${roomId}`);
      const rooms = userRooms.get(userId) || [];
      if (!rooms.includes(roomId)) {
        rooms.push(roomId);
        userRooms.set(userId, rooms);
      }

      socket.to(`chat:${roomId}`).emit('user_joined_room', {
        userId,
        roomId,
        timestamp: new Date()
      });

      logger.info(`User ${userId} joined chat room: ${roomId}`);
    });

    socket.on('leave_chat_room', (roomId) => {
      socket.leave(`chat:${roomId}`);
      const rooms = userRooms.get(userId) || [];
      const index = rooms.indexOf(roomId);
      if (index > -1) {
        rooms.splice(index, 1);
        userRooms.set(userId, rooms);
      }

      socket.to(`chat:${roomId}`).emit('user_left_room', {
        userId,
        roomId,
        timestamp: new Date()
      });

      logger.info(`User ${userId} left chat room: ${roomId}`);
    });

    socket.on('chat_message', (data) => {
      const { roomId, messageId, content, messageType, metadata } = data;

      socket.to(`chat:${roomId}`).emit('new_message', {
        messageId,
        roomId,
        senderId: userId,
        content,
        messageType,
        metadata,
        timestamp: new Date()
      });

      logger.info(`User ${userId} sent message to room ${roomId}`);
    });

    socket.on('typing_indicator', ({ roomId, isTyping }) => {
      socket.to(`chat:${roomId}`).emit('user_typing', {
        userId,
        roomId,
        isTyping,
        timestamp: new Date()
      });
    });

    socket.on('message_read', ({ roomId, messageId }) => {
      socket.to(`chat:${roomId}`).emit('message_read_receipt', {
        messageId,
        userId,
        roomId,
        timestamp: new Date()
      });
    });

    socket.on('message_reaction', ({ roomId, messageId, emoji }) => {
      socket.to(`chat:${roomId}`).emit('new_reaction', {
        messageId,
        userId,
        emoji,
        timestamp: new Date()
      });
    });

    socket.on('voice_call_initiate', ({ roomId, callId, callType }) => {
      socket.to(`chat:${roomId}`).emit('incoming_call', {
        callId,
        roomId,
        callType,
        initiatedBy: userId,
        timestamp: new Date()
      });
      logger.info(`User ${userId} initiated ${callType} call in room ${roomId}`);
    });

    socket.on('voice_call_answer', ({ callId, roomId }) => {
      socket.to(`chat:${roomId}`).emit('call_answered', {
        callId,
        userId,
        timestamp: new Date()
      });
      logger.info(`User ${userId} answered call ${callId}`);
    });

    socket.on('voice_call_decline', ({ callId, roomId }) => {
      socket.to(`chat:${roomId}`).emit('call_declined', {
        callId,
        userId,
        timestamp: new Date()
      });
      logger.info(`User ${userId} declined call ${callId}`);
    });

    socket.on('voice_call_end', ({ callId, roomId }) => {
      socket.to(`chat:${roomId}`).emit('call_ended', {
        callId,
        endedBy: userId,
        timestamp: new Date()
      });
      logger.info(`User ${userId} ended call ${callId}`);
    });

    socket.on('webrtc_signal', ({ roomId, targetUserId, signal }) => {
      io.to(`user:${targetUserId}`).emit('webrtc_signal', {
        fromUserId: userId,
        roomId,
        signal
      });
    });

    socket.on('join_room', (roomId) => {
      socket.join(roomId);
      const rooms = userRooms.get(userId) || [];
      rooms.push(roomId);
      userRooms.set(userId, rooms);
      logger.info(`User ${userId} joined room: ${roomId}`);
    });

    socket.on('leave_room', (roomId) => {
      socket.leave(roomId);
      const rooms = userRooms.get(userId) || [];
      const index = rooms.indexOf(roomId);
      if (index > -1) {
        rooms.splice(index, 1);
        userRooms.set(userId, rooms);
      }
      logger.info(`User ${userId} left room: ${roomId}`);
    });

    socket.on('subscribe_order', (orderId) => {
      socket.join(`order:${orderId}`);
      logger.info(`User ${userId} subscribed to order: ${orderId}`);
    });

    socket.on('subscribe_inventory', (productId) => {
      socket.join(`product:${productId}`);
      logger.info(`User ${userId} subscribed to product inventory: ${productId}`);
    });

    socket.on('typing', ({ roomId, isTyping }) => {
      socket.to(roomId).emit('user_typing', {
        userId,
        isTyping
      });
    });

    socket.on('disconnect', () => {
      logger.info(`User disconnected: ${userId}`);
      connectedUsers.delete(userId);
      userRooms.delete(userId);

      if (companyId) {
        io.to(`company:${companyId}`).emit('user_offline', {
          userId,
          timestamp: new Date()
        });
      }
    });

    socket.emit('connected', {
      message: 'Successfully connected to WebSocket server',
      userId,
      socketId: socket.id,
      companyId
    });

    if (companyId) {
      socket.to(`company:${companyId}`).emit('user_online', {
        userId,
        timestamp: new Date()
      });
    }
  });

  return io;
}

function emitToUser(io, userId, event, data) {
  io.to(`user:${userId}`).emit(event, data);
}

function emitToCompany(io, companyId, event, data) {
  io.to(`company:${companyId}`).emit(event, data);
}

function emitToShop(io, shopId, event, data) {
  io.to(`shop:${shopId}`).emit(event, data);
}

function emitToRoom(io, roomId, event, data) {
  io.to(roomId).emit(event, data);
}

function broadcastToAll(io, event, data) {
  io.emit(event, data);
}

function getConnectedUsers() {
  return Array.from(connectedUsers.keys());
}

function isUserConnected(userId) {
  return connectedUsers.has(userId);
}

module.exports = {
  setupSocketIO,
  emitToUser,
  emitToCompany,
  emitToShop,
  emitToRoom,
  broadcastToAll,
  getConnectedUsers,
  isUserConnected
};
