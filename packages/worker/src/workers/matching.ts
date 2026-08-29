import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';
import { eq, and, gte } from 'drizzle-orm';
import { db, supplierProducts, products, brands } from '@pricehunt/db';
import { calculateMatch } from '@pricehunt/db';

const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

export const matchingQueue = new Queue('product-matching', { connection });

const matchingWorker = new Worker(
  'product-matching',
  async (job) => {
    const { supplierProductId, title, brand, gtin, attributes } = job.data as {
      supplierProductId: string;
      title: string;
      brand?: string;
      gtin?: string;
      attributes?: Record<string, unknown>;
    };

    job.updateProgress(10);

    const existingProducts = await db
      .select({
        id: products.id,
        canonicalName: products.canonicalName,
        brandName: brands.name,
        gtin: products.gtin,
        attributes: products.attributes,
      })
      .from(products)
      .leftJoin(brands, eq(products.brandId, brands.id))
      .where(eq(products.isActive, true))
      .limit(100);

    job.updateProgress(50);

    let bestMatch = null;
    let bestScore = 0;

    for (const product of existingProducts) {
      const match = calculateMatch(
        {
          title,
          brand: brand || null,
          gtin: gtin || null,
          attributes: attributes || {},
        },
        {
          title: product.canonicalName,
          brand: product.brandName || null,
          gtin: product.gtin || null,
          attributes: (product.attributes as Record<string, unknown>) || {},
        },
      );

      if (match.confidence > bestScore) {
        bestScore = match.confidence;
        bestMatch = {
          productId: product.id,
          confidence: match.confidence,
          type: match.type,
        };
      }
    }

    job.updateProgress(80);

    if (bestMatch && bestMatch.confidence >= 0.60) {
      await db
        .update(supplierProducts)
        .set({
          productId: bestMatch.productId,
          matchConfidence: bestMatch.confidence.toString(),
          matchType: bestMatch.type,
          updatedAt: new Date(),
        })
        .where(eq(supplierProducts.id, supplierProductId));

      job.updateProgress(100);

      return {
        matched: true,
        productId: bestMatch.productId,
        confidence: bestMatch.confidence,
        type: bestMatch.type,
      };
    }

    job.updateProgress(100);

    return {
      matched: false,
      confidence: bestScore,
    };
  },
  {
    connection,
    concurrency: 5,
  },
);

matchingWorker.on('completed', (job) => {
  const result = job.returnvalue;
  if (result?.matched) {
    console.log(
      `Matching ${job.id}: matched with confidence ${result.confidence}`,
    );
  } else {
    console.log(`Matching ${job.id}: no match found`);
  }
});

matchingWorker.on('failed', (job, err) => {
  console.error(`Matching ${job?.id} failed:`, err.message);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down matching worker...');
  await matchingWorker.close();
  process.exit(0);
});
