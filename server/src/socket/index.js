const { Server } = require('socket.io');
const { verifyToken } = require('../utils/jwt');
const prisma = require('../config/prisma');
const logger = require('../utils/logger');

let io = null;

const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // JWT Authentication Middleware for Socket.IO
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, '');

      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const decoded = verifyToken(token);
      if (!decoded || !decoded.userId) {
        return next(new Error('Invalid or expired token'));
      }

      // Fetch user with active status & department assignments
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        include: {
          role: true,
          departments: {
            include: { department: true },
          },
        },
      });

      if (!user || user.status !== 'ACTIVE' || user.deletedAt) {
        return next(new Error('Account inactive or not found'));
      }

      socket.user = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role.name,
        departments: user.departments.map((d) => d.department),
      };

      next();
    } catch (err) {
      logger.error('Socket authentication error:', err.message);
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.user;
    logger.info(`🔌 Socket connected: ${user.email} (${socket.id})`);

    // 1. Join user's personal notification room
    socket.join(`user:${user.id}`);

    // 2. Join department rooms for all assigned departments
    user.departments.forEach((dept) => {
      socket.join(`dept:${dept.id}`);
    });

    // 3. Super Admins and Admins join the global administrative room
    if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') {
      socket.join('admin:all');
    }

    // Client requests to view a specific conversation
    socket.on('conversation:join', async ({ conversationId }, callback) => {
      try {
        if (!conversationId) return;

        const conversation = await prisma.conversation.findUnique({
          where: { id: conversationId },
          select: { id: true, departmentId: true, assignedToUserId: true },
        });

        if (!conversation) {
          if (callback) callback({ error: 'Conversation not found' });
          return;
        }

        // Verify department access
        const isPrivileged = user.role === 'SUPER_ADMIN' || user.role === 'ADMIN';
        const userDeptIds = user.departments.map((d) => d.id);
        const hasAccess =
          isPrivileged ||
          !conversation.departmentId ||
          userDeptIds.includes(conversation.departmentId) ||
          conversation.assignedToUserId === user.id;

        if (!hasAccess) {
          if (callback) callback({ error: 'Forbidden: unauthorized department' });
          return;
        }

        socket.join(`conversation:${conversationId}`);
        if (callback) callback({ success: true, room: `conversation:${conversationId}` });
      } catch (err) {
        if (callback) callback({ error: err.message });
      }
    });

    // Client leaves conversation room
    socket.on('conversation:leave', ({ conversationId }) => {
      if (conversationId) {
        socket.leave(`conversation:${conversationId}`);
      }
    });

    socket.on('disconnect', (reason) => {
      logger.info(`Socket disconnected: ${user.email} (${reason})`);
    });
  });

  return io;
};

const getIO = () => io;

// Real-Time Event Emitters
const emitToConversation = (conversationId, event, data) => {
  if (!io) return;
  io.to(`conversation:${conversationId}`).emit(event, data);
};

const emitToDepartment = (departmentId, event, data) => {
  if (!io) return;
  if (departmentId) {
    io.to(`dept:${departmentId}`).to('admin:all').emit(event, data);
  } else {
    // Unassigned fallback queue goes to all authenticated staff
    io.emit(event, data);
  }
};

const emitToUser = (userId, event, data) => {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, data);
};

const emitOperationalUpdate = (departmentId, data) => {
  if (!io) return;
  if (departmentId) {
    io.to(`dept:${departmentId}`).to('admin:all').emit('operational:metric_update', data);
  } else {
    io.to('admin:all').emit('operational:metric_update', data);
  }
};

module.exports = {
  initSocket,
  getIO,
  emitToConversation,
  emitToDepartment,
  emitToUser,
  emitOperationalUpdate,
};
