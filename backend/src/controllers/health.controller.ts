import { Request, Response } from 'express';
import { prisma } from '../repositories/prisma.js';
import { redisClient } from '../queue/redis.js';

export class HealthController {
  public static async check(_req: Request, res: Response): Promise<void> {
    const healthStatus: Record<string, string> = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: `${process.uptime().toFixed(1)}s`,
    };

    let isHealthy = true;

    // Check Postgres
    try {
      await prisma.$queryRaw`SELECT 1`;
      healthStatus.database = 'connected';
    } catch (err) {
      healthStatus.database = 'disconnected';
      isHealthy = false;
    }

    // Check Redis
    try {
      const pong = await redisClient.ping();
      healthStatus.redis = pong === 'PONG' ? 'connected' : 'error';
      if (pong !== 'PONG') isHealthy = false;
    } catch (err) {
      healthStatus.redis = 'disconnected';
      isHealthy = false;
    }

    res.status(isHealthy ? 200 : 503).json(healthStatus);
  }
}
