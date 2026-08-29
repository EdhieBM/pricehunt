import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';
import { db, suppliers, supplierProducts, currentPrices, products, brands } from '@pricehunt/db';
import { getSupplierAdapter } from '@pricehunt/db';
import type { SupplierSlug } from '@pricehunt/shared';
import { parseProductUrl } from '@pricehunt/shared';
import { indexProduct, type MeiliProduct } from '@pricehunt/db';
import { calculateMatch } from '@pricehunt/db';
import { eq, and, gte } from 'drizzle-orm';

const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

// ─── Queues ─────────────────────────────────────────────
export const priceUpdateQueue = new Queue('price-updates', { connection });
export const orderProcessingQueue = new Queue('order-processing', { connection });
export const trackingQueue = new Queue('tracking', { connection });
export const ingestionQueue = new Queue('product-ingestion', { connection });
export const matchingQueue = new Queue('product-matching', { connection });

// ─── Ingestion Worker ───────────────────────────────────
const ingestionWorker = new Worker(
  'product-ingestion',
  async (job) => {
    const { url, supplierSlug } = job.data as {
      url: string;
      supplierSlug?: SupplierSlug;
    };

    console.log(`[INGESTION] Starting for ${url}`);
    job.updateProgress(10);

    const parsed = parseProductUrl(url);
    if (!parsed) {
      throw new Error(`Could not parse URL: ${url}`);
    }

    const slug = supplierSlug || parsed.supplier;
    const adapter = getSupplierAdapter(slug);

    job.updateProgress(30);
    const identified = await adapter.identify({ url });
    console.log(`[INGESTION] Identified: ${identified.title}`);

    job.updateProgress(50);
    const priceData = await adapter.getPrice(parsed.productId);

    job.updateProgress(70);

    // Get or create supplier
    const existingSuppliers = await db
      .select()
      .from(suppliers)
      .where(eq(suppliers.slug, slug))
      .limit(1);

    let supplier = existingSuppliers[0];
    if (!supplier) {
      const names: Record<string, string> = {
        aliexpress: 'AliExpress',
        amazon: 'Amazon',
        mercadolibre: 'Mercado Libre',
        ebay: 'eBay',
        walmart: 'Walmart',
        shein: 'SHEIN',
        temu: 'Temu',
        tiktokshop: 'TikTok Shop',
      };
      const [created] = await db
        .insert(suppliers)
        .values({ name: names[slug] || slug, slug, type: 'api' })
        .returning();
      supplier = created;
    }

    if (!supplier) throw new Error('Failed to get/create supplier');

    // Upsert supplier product
    const existingSP = await db
      .select()
      .from(supplierProducts)
      .where(eq(supplierProducts.supplierProductId, parsed.productId))
      .limit(1);

    let sp;
    if (existingSP.length > 0 && existingSP[0]) {
      sp = existingSP[0];
      await db
        .update(supplierProducts)
        .set({ rawData: identified, lastSyncedAt: new Date() })
        .where(eq(supplierProducts.id, sp.id));
    } else {
      const [created] = await db
        .insert(supplierProducts)
        .values({
          supplierId: supplier.id,
          supplierProductId: parsed.productId,
          matchConfidence: '0.50',
          matchType: 'unknown',
          rawData: identified,
        })
        .returning();
      sp = created;
    }

    // Upsert current price
    const existingPrices = await db
      .select()
      .from(currentPrices)
      .where(eq(currentPrices.supplierProductId, sp!.id))
      .limit(1);

    const finalPrice = priceData.price + priceData.shippingCost;

    if (existingPrices.length > 0 && existingPrices[0]) {
      await db
        .update(currentPrices)
        .set({
          price: priceData.price.toString(),
          currency: priceData.currency,
          shippingCost: priceData.shippingCost.toString(),
          finalPrice: finalPrice.toString(),
          inStock: priceData.inStock,
          stockQuantity: priceData.stockQuantity,
          deliveryDaysMin: priceData.deliveryDaysMin,
          deliveryDaysMax: priceData.deliveryDaysMax,
          lastUpdated: new Date(),
        })
        .where(eq(currentPrices.id, existingPrices[0].id));
    } else {
      await db.insert(currentPrices).values({
        supplierProductId: sp!.id,
        price: priceData.price.toString(),
        currency: priceData.currency,
        shippingCost: priceData.shippingCost.toString(),
        finalPrice: finalPrice.toString(),
        inStock: priceData.inStock,
        stockQuantity: priceData.stockQuantity,
        deliveryDaysMin: priceData.deliveryDaysMin,
        deliveryDaysMax: priceData.deliveryDaysMax,
      });
    }

    job.updateProgress(90);

    // Index in Meilisearch
    try {
      const meiliProduct: MeiliProduct = {
        id: sp!.id,
        title: identified.title,
        description: identified.description,
        brand: (identified.attributes?.brand as string) || null,
        category: null,
        price: priceData.price,
        currency: priceData.currency,
        imageUrl: identified.images[0] || null,
        supplier: slug,
        inStock: priceData.inStock,
        matchConfidence: 0.5,
        slug: identified.title.toLowerCase().replace(/\s+/g, '-'),
      };
      await indexProduct(meiliProduct);
    } catch {
      // Meilisearch may not be running
    }

    job.updateProgress(100);

    console.log(`[INGESTION] Complete: ${identified.title} — $${priceData.price} ${priceData.currency}`);

    return {
      success: true,
      supplierProductId: sp!.id,
      title: identified.title,
      price: priceData.price,
      currency: priceData.currency,
    };
  },
  {
    connection,
    concurrency: 3,
    limiter: { max: 10, duration: 60000 },
  },
);

ingestionWorker.on('completed', (job) => {
  console.log(`[INGESTION] Job ${job.id} completed: ${job.returnvalue?.title}`);
});
ingestionWorker.on('failed', (job, err) => {
  console.error(`[INGESTION] Job ${job?.id} failed:`, err.message);
});

// ─── Matching Worker ────────────────────────────────────
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

    console.log(`[MATCHING] Starting for: ${title}`);
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
        { title, brand: brand || null, gtin: gtin || null, attributes: attributes || {} },
        {
          title: product.canonicalName,
          brand: product.brandName || null,
          gtin: product.gtin || null,
          attributes: (product.attributes as Record<string, unknown>) || {},
        },
      );

      if (match.confidence > bestScore) {
        bestScore = match.confidence;
        bestMatch = { productId: product.id, confidence: match.confidence, type: match.type };
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

      console.log(`[MATCHING] Matched with confidence ${bestMatch.confidence}`);
      job.updateProgress(100);
      return { matched: true, productId: bestMatch.productId, confidence: bestMatch.confidence, type: bestMatch.type };
    }

    console.log(`[MATCHING] No match found (best score: ${bestScore})`);
    job.updateProgress(100);
    return { matched: false, confidence: bestScore };
  },
  { connection, concurrency: 5 },
);

matchingWorker.on('completed', (job) => {
  const result = job.returnvalue;
  if (result?.matched) {
    console.log(`[MATCHING] Job ${job.id}: matched (confidence ${result.confidence})`);
  } else {
    console.log(`[MATCHING] Job ${job.id}: no match`);
  }
});
matchingWorker.on('failed', (job, err) => {
  console.error(`[MATCHING] Job ${job?.id} failed:`, err.message);
});

// ─── Price Update Worker (stub) ─────────────────────────
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

console.log('=== PriceHunt Workers Started ===');
console.log('Queues: product-ingestion, product-matching, price-updates, order-processing, tracking');

process.on('SIGTERM', async () => {
  console.log('Shutting down workers...');
  await ingestionWorker.close();
  await matchingWorker.close();
  await priceUpdateWorker.close();
  await orderProcessingWorker.close();
  await trackingWorker.close();
  process.exit(0);
});
