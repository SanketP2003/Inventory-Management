import 'dotenv/config';

export const config = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: process.env.DATABASE_URL ?? '',
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
  clientOrigin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
  otpTtlMinutes: Number(process.env.OTP_TTL_MINUTES ?? 10),
  highValueReorderLimit: Number(process.env.HIGH_VALUE_REORDER_LIMIT ?? 1000)
};

if (!config.databaseUrl) console.warn('DATABASE_URL is not configured; database requests will fail.');
