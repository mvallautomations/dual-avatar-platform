import Redis, { RedisOptions } from 'ioredis';
import { logger } from '../utils/logger';

const redisConfig: RedisOptions = {
  host: process.env.REDIS_MANUAL_HOST || 'redis-manual',
  port: parseInt(process.env.REDIS_MANUAL_PORT || '6379'),
  password: process.env.REDIS_MANUAL_PASSWORD,
  db: parseInt(process.env.REDIS_MANUAL_DB || '0'),
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: false,
};

let redisClient: Redis;

export const initializeRedis = async (): Promise<void> => {
  try {
    redisClient = new Redis(redisConfig);

    redisClient.on('connect', () => {
      logger.info('Redis client connected');
    });

    redisClient.on('ready', () => {
      logger.info('Redis client ready');
    });

    redisClient.on('error', (error) => {
      logger.error('Redis client error:', error);
    });

    redisClient.on('close', () => {
      logger.warn('Redis client connection closed');
    });

    redisClient.on('reconnecting', () => {
      logger.info('Redis client reconnecting');
    });

    // Test the connection
    await redisClient.ping();
  } catch (error) {
    logger.error('Failed to initialize Redis:', error);
    throw error;
  }
};

export const getRedisClient = (): Redis => {
  if (!redisClient) {
    throw new Error('Redis client not initialized. Call initializeRedis first.');
  }
  return redisClient;
};

// Helper functions for common Redis operations
export const cacheGet = async (key: string): Promise<string | null> => {
  try {
    return await redisClient.get(key);
  } catch (error) {
    logger.error('Redis GET error:', { key, error });
    return null;
  }
};

export const cacheSet = async (
  key: string,
  value: string,
  ttl?: number
): Promise<boolean> => {
  try {
    if (ttl) {
      await redisClient.setex(key, ttl, value);
    } else {
      await redisClient.set(key, value);
    }
    return true;
  } catch (error) {
    logger.error('Redis SET error:', { key, error });
    return false;
  }
};

export const cacheDel = async (key: string): Promise<boolean> => {
  try {
    await redisClient.del(key);
    return true;
  } catch (error) {
    logger.error('Redis DEL error:', { key, error });
    return false;
  }
};

export const cacheExists = async (key: string): Promise<boolean> => {
  try {
    const result = await redisClient.exists(key);
    return result === 1;
  } catch (error) {
    logger.error('Redis EXISTS error:', { key, error });
    return false;
  }
};
