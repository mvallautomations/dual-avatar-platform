import dotenv from 'dotenv';
import app from './app';
import { logger } from './utils/logger';
import { initializeDatabase } from './config/database';
import { initializeRedis } from './config/redis';
import { initializeSocketIO } from './config/socket';
import http from 'http';

// Load environment variables
dotenv.config();

const PORT = process.env.MANUAL_BACKEND_PORT || 8080;

async function startServer() {
  try {
    // Initialize database connection
    await initializeDatabase();
    logger.info('Database connection established');

    // Initialize Redis connection
    await initializeRedis();
    logger.info('Redis connection established');

    // Create HTTP server
    const server = http.createServer(app);

    // Initialize Socket.IO
    initializeSocketIO(server);
    logger.info('Socket.IO initialized');

    // Start listening
    server.listen(PORT, () => {
      logger.info(`Manual Platform Backend running on port ${PORT}`);
      logger.info(`Environment: ${process.env.MANUAL_NODE_ENV || 'development'}`);
      logger.info(`API Version: ${process.env.MANUAL_API_VERSION || 'v1'}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM signal received: closing HTTP server');
      server.close(async () => {
        logger.info('HTTP server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', async () => {
      logger.info('SIGINT signal received: closing HTTP server');
      server.close(async () => {
        logger.info('HTTP server closed');
        process.exit(0);
      });
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
