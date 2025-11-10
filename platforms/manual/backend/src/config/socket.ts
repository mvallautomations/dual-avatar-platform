import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { logger } from '../utils/logger';
import jwt from 'jsonwebtoken';

let io: SocketIOServer;

export const initializeSocketIO = (server: HTTPServer): SocketIOServer => {
  io = new SocketIOServer(server, {
    cors: {
      origin: process.env.MANUAL_CORS_ORIGIN || 'http://localhost:3000',
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    try {
      const decoded = jwt.verify(token, process.env.MANUAL_JWT_SECRET || 'secret');
      socket.data.user = decoded;
      next();
    } catch (error) {
      logger.error('Socket authentication error:', error);
      next(new Error('Authentication error: Invalid token'));
    }
  });

  // Connection handler
  io.on('connection', (socket) => {
    const userId = socket.data.user?.id;
    logger.info(`Socket connected: ${socket.id} (User: ${userId})`);

    // Join user-specific room
    if (userId) {
      socket.join(`user:${userId}`);
    }

    // Handle video rendering progress updates
    socket.on('subscribe:render', (videoId: string) => {
      socket.join(`render:${videoId}`);
      logger.debug(`Socket ${socket.id} subscribed to render:${videoId}`);
    });

    socket.on('unsubscribe:render', (videoId: string) => {
      socket.leave(`render:${videoId}`);
      logger.debug(`Socket ${socket.id} unsubscribed from render:${videoId}`);
    });

    // Handle preview updates
    socket.on('subscribe:preview', (projectId: string) => {
      socket.join(`preview:${projectId}`);
      logger.debug(`Socket ${socket.id} subscribed to preview:${projectId}`);
    });

    socket.on('unsubscribe:preview', (projectId: string) => {
      socket.leave(`preview:${projectId}`);
      logger.debug(`Socket ${socket.id} unsubscribed from preview:${projectId}`);
    });

    // Disconnect handler
    socket.on('disconnect', (reason) => {
      logger.info(`Socket disconnected: ${socket.id} (Reason: ${reason})`);
    });

    // Error handler
    socket.on('error', (error) => {
      logger.error(`Socket error: ${socket.id}`, error);
    });
  });

  return io;
};

export const getIO = (): SocketIOServer => {
  if (!io) {
    throw new Error('Socket.IO not initialized. Call initializeSocketIO first.');
  }
  return io;
};

// Helper functions for emitting events
export const emitToUser = (userId: string, event: string, data: any) => {
  io.to(`user:${userId}`).emit(event, data);
};

export const emitRenderProgress = (videoId: string, progress: number, status: string) => {
  io.to(`render:${videoId}`).emit('render:progress', { videoId, progress, status });
};

export const emitPreviewUpdate = (projectId: string, data: any) => {
  io.to(`preview:${projectId}`).emit('preview:update', data);
};
