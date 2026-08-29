import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';

const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

export const priceUpdateQueue = new Queue('price-updates', { connection });
export const orderProcessingQueue = new Queue('order-processing', { connection });
export const trackingQueue = new Queue('tracking', { connection });

const priceUpdateWorker = new Worker(
  'price-updates',
  async (job) => {
    const { supplierProductId } = job.data;
    console.log(`Processing price update for ${supplierProductId}`);
    return { success: true };
  },
  { connection, concurrency: 5 },
);

const orderProcessingWorker = new Worker(
  'order-processing',
  async (job) => {
    const { orderId } = job.data;
    console.log(`Processing order ${orderId}`);
    return { success: true };
  },
  { connection, concurrency: 3 },
);

const trackingWorker = new Worker(
  'tracking',
  async (job) => {
    const { shipmentId } = job.data;
    console.log(`Processing tracking for ${shipmentId}`);
    return { success: true };
  },
  { connection, concurrency: 5 },
);

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

process.on('SIGTERM', async () => {
  console.log('Shutting down workers...');
  await priceUpdateWorker.close();
  await orderProcessingWorker.close();
  await trackingWorker.close();
  process.exit(0);
});
