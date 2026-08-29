import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';
import { eq } from 'drizzle-orm';
import { db, suppliers, supplierProducts, currentPrices } from '@pricehunt/db';
import { getSupplierAdapter } from '@pricehunt/db';
import type { SupplierSlug } from '@pricehunt/shared';
import { parseProductUrl } from '@pricehunt/shared';
import { indexProduct, type MeiliProduct } from '@pricehunt/db';

const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

export const ingestionQueue = new Queue('product-ingestion', { connection });

const ingestionWorker = new Worker(
  'product-ingestion',
  async (job) => {
    const { url, supplierSlug } = job.data as {
      url: string;
      supplierSlug?: SupplierSlug;
    };

    job.updateProgress(10);

    const parsed = parseProductUrl(url);
    if (!parsed) {
      throw new Error(`Could not parse URL: ${url}`);
    }

    const slug = supplierSlug || parsed.supplier;
    const adapter = getSupplierAdapter(slug);

    job.updateProgress(30);

    const identified = await adapter.identify({ url });

    job.updateProgress(50);

    const priceData = await adapter.getPrice(parsed.productId);

    job.updateProgress(70);

    const supplier = await getOrCreateSupplier(slug);
    if (!supplier) throw new Error('Failed to get supplier');

    const supplierProduct = await upsertSupplierProduct(
      supplier.id,
      parsed.productId,
      {
        title: identified.title,
        description: identified.description,
        images: identified.images,
        price: identified.price,
        currency: identified.currency,
        inStock: identified.inStock,
        attributes: identified.attributes,
      },
    );

    if (!supplierProduct) throw new Error('Failed to create supplier product');

    await upsertCurrentPrice(supplierProduct.id, priceData);

    job.updateProgress(90);

    const meiliProduct: MeiliProduct = {
      id: supplierProduct.id,
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

    try {
      await indexProduct(meiliProduct);
    } catch {
      // Meilisearch may not be running — log but don't fail
    }

    job.updateProgress(100);

    return {
      success: true,
      supplierProductId: supplierProduct.id,
      title: identified.title,
      price: priceData.price,
      currency: priceData.currency,
    };
  },
  {
    connection,
    concurrency: 3,
    limiter: {
      max: 10,
      duration: 60000,
    },
  },
);

ingestionWorker.on('completed', (job) => {
  console.log(`Ingestion ${job.id} completed: ${job.returnvalue?.title}`);
});

ingestionWorker.on('failed', (job, err) => {
  console.error(`Ingestion ${job?.id} failed:`, err.message);
});

async function getOrCreateSupplier(slug: SupplierSlug) {
  const existing = await db
    .select()
    .from(suppliers)
    .where(eq(suppliers.slug, slug))
    .limit(1);

  if (existing.length > 0) return existing[0];

  const names: Record<SupplierSlug, string> = {
    aliexpress: 'AliExpress',
    amazon: 'Amazon',
    mercadolibre: 'Mercado Libre',
  };

  const [created] = await db
    .insert(suppliers)
    .values({ name: names[slug], slug, type: 'api' })
    .returning();

  return created;
}

async function upsertSupplierProduct(
  supplierId: string,
  supplierProductId: string,
  data: Record<string, unknown>,
) {
  const existing = await db
    .select()
    .from(supplierProducts)
    .where(eq(supplierProducts.supplierProductId, supplierProductId))
    .limit(1);

  if (existing.length > 0) {
    const record = existing[0];
    if (!record) return null;
    await db
      .update(supplierProducts)
      .set({ rawData: data, lastSyncedAt: new Date() })
      .where(eq(supplierProducts.id, record.id));
    return record;
  }

  const [created] = await db
    .insert(supplierProducts)
    .values({
      supplierId,
      supplierProductId,
      matchConfidence: '0.50',
      matchType: 'unknown',
      rawData: data,
    })
    .returning();

  return created;
}

async function upsertCurrentPrice(
  supplierProductId: string,
  priceData: {
    price: number;
    currency: string;
    shippingCost: number;
    inStock: boolean;
    stockQuantity: number | null;
    deliveryDaysMin: number | null;
    deliveryDaysMax: number | null;
  },
) {
  const existing = await db
    .select()
    .from(currentPrices)
    .where(eq(currentPrices.supplierProductId, supplierProductId))
    .limit(1);

  const finalPrice = priceData.price + priceData.shippingCost;

  if (existing.length > 0) {
    const record = existing[0];
    if (!record) return;
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
      .where(eq(currentPrices.id, record.id));
  } else {
    await db.insert(currentPrices).values({
      supplierProductId,
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
}

process.on('SIGTERM', async () => {
  console.log('Shutting down ingestion worker...');
  await ingestionWorker.close();
  process.exit(0);
});
