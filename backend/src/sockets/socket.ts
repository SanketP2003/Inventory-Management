import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import {
  startRedisSubscriber,
  ReorderUpdatePayload,
} from './pubsub.js';

export interface LowStockEventData {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  lowStockThreshold: number;
  reorderQuantity: number;
  timestamp: string;
}

let io: SocketIOServer | null = null;

export const initSocketServer = (httpServer: HttpServer): SocketIOServer => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: env.CORS_ORIGIN,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  io.on('connection', (socket: Socket) => {
    logger.info(`Socket client connected: ${socket.id}`);

    socket.on('disconnect', (reason) => {
      logger.info(`Socket client disconnected: ${socket.id} (Reason: ${reason})`);
    });
  });

  // Relay messages received from Redis Pub/Sub to all Socket.IO clients
  startRedisSubscriber((event, data) => {
    if (io) {
      logger.info(`Relaying '${event}' from Redis to connected socket clients for reorder ${data.id}`);
      io.emit(event, data);
    }
  });

  logger.info('Socket.IO server initialized.');
  return io;
};

export const getIO = (): SocketIOServer => {
  if (!io) {
    throw new Error('Socket.IO has not been initialized yet.');
  }
  return io;
};

export const emitLowStockEvent = (data: LowStockEventData): void => {
  if (io) {
    logger.info(`Broadcasting 'low-stock' event for product SKU: ${data.sku}`);
    io.emit('low-stock', data);
  }
};

export const emitReorderUpdated = (data: ReorderUpdatePayload): void => {
  if (io) {
    logger.info(`Broadcasting 'reorder-updated' event for reorder ID: ${data.id}`);
    io.emit('reorder-updated', data);
  }
};
