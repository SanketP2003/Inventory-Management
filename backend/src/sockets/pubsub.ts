import { createRedisClient } from '../queue/redis.js';
import { logger } from '../utils/logger.js';

export const REORDER_PUBSUB_CHANNEL = 'inventory:reorder-events';

export interface ReorderUpdatePayload {
  id: string;
  productId: string;
  productName?: string;
  sku?: string;
  quantityOrdered: number;
  supplierName: string;
  totalValue: number | string;
  status: string;
  failureReason?: string | null;
  attempts: number;
  approvedAt?: string | null;
  updatedAt: string;
  otp?: string;
}

let publisherClient: ReturnType<typeof createRedisClient> | null = null;
let subscriberClient: ReturnType<typeof createRedisClient> | null = null;

export const getPublisher = () => {
  if (!publisherClient) {
    publisherClient = createRedisClient('pubsub-publisher');
  }
  return publisherClient;
};

export const publishReorderUpdate = async (data: ReorderUpdatePayload): Promise<void> => {
  try {
    const publisher = getPublisher();
    const payload = JSON.stringify({
      event: 'reorder-updated',
      data,
    });
    await publisher.publish(REORDER_PUBSUB_CHANNEL, payload);
    logger.debug(`Published reorder update to Redis: ${data.id} -> ${data.status}`);
  } catch (err) {
    logger.error('Failed to publish reorder update to Redis:', err);
  }
};

export const startRedisSubscriber = (
  onEventReceived: (event: string, data: ReorderUpdatePayload) => void
): void => {
  if (!subscriberClient) {
    subscriberClient = createRedisClient('pubsub-subscriber');
    subscriberClient.subscribe(REORDER_PUBSUB_CHANNEL, (err, count) => {
      if (err) {
        logger.error('Failed to subscribe to Redis channel:', err);
        return;
      }
      logger.info(`Subscribed to Redis channel ${REORDER_PUBSUB_CHANNEL}. Total subscriptions: ${count}`);
    });

    subscriberClient.on('message', (channel, message) => {
      if (channel === REORDER_PUBSUB_CHANNEL) {
        try {
          const parsed = JSON.parse(message) as { event: string; data: ReorderUpdatePayload };
          onEventReceived(parsed.event, parsed.data);
        } catch (err) {
          logger.error('Failed to parse Redis pub/sub message:', err);
        }
      }
    });
  }
};

export const closePubSub = async (): Promise<void> => {
  if (publisherClient) {
    await publisherClient.quit();
    publisherClient = null;
  }
  if (subscriberClient) {
    await subscriberClient.quit();
    subscriberClient = null;
  }
};
