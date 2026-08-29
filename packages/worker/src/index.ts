import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';

const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

// Queues
export const priceUpdateQueue = new Queue('price-updates', { connection });
export const orderProcessingQueue = new Queue('order-processing', { connection });
export const trackingQueue = new Queue('tracking', { connection });

// Workers
const priceUpdateWorker = new Worker(
  'price-updates',
  async (job) => {
    const { supplierProductId } = job.data;
    console.log(`Processing price update for ${supplierProductId}`);

    // TODO: Fetch new price from supplier
    // TODO: Compare with current price
    // TODO: Update current_prices and insert price_event
    // TODO: Recalculate offers if price changed significantly

    return { success: true };
  },
  { connection, concurrency: 5 },
);

const orderProcessingWorker = new Worker(
  'order-processing',
  async (job) => {
    const { orderId } = job.data;
    console.log(`Processing order ${orderId}`);

    // TODO: Route order to supplier
    // TODO: Handle supplier confirmation
    // TODO: Update order status
    // TODO: Send confirmation email

    return { success: true };
  },
  { connection, concurrency: 3 },
);

const trackingWorker = new Worker(
  'tracking',
  async (job) => {
    const { shipmentId } = job.data;
    console.log(`Processing tracking for ${shipmentId}`);

    // TODO: Fetch tracking from carrier
    // TODO: Update tracking events
    // TODO: Notify user if status changed

    return { success: true };
  },
  { connection, concurrency: 5 },
);

// Event listeners
priceUpdateWorker.on('completed', (job) => {
  console.log(`Price update ${job.id} completed`);
});

priceUpdateWorker.on('failed', (job, err) => {
  console.error(`Price update ${job?.id} failed:`, err.message);
});

orderProcessingWorker.on('completed', (job) => {
  console.log(`Order processing ${job.id} completed`);
});

orderProcessingWorker.on('failed', (job, err) => {
  console.error(`Order processing ${job?.id} failed:`, err.message);
});

console.log('Workers started');

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down workers...');
  await priceUpdateWorker.close();
  await orderProcessingWorker.close();
  await trackingWorker.close();
  process.exit(0);
});
