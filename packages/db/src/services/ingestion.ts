import { eq } from 'drizzle-orm';
import { db, suppliers, supplierProducts, currentPrices } from '../index';
import { getSupplierAdapter } from './supplier';
import type { SupplierSlug } from '@pricehunt/shared';
import type { SupplierAdapter } from '@pricehunt/shared';
import { parseProductUrl } from '@pricehunt/shared';

export interface IngestionResult {
  supplierProductId: string;
  canonicalName: string;
  description: string | null;
  brand: string | null;
  images: string[];
  price: number;
  currency: string;
  shippingCost: number;
  inStock: boolean;
  supplierId: string;
  supplierSlug: string;
}

export async function ingestFromUrl(url: string): Promise<IngestionResult> {
  const parsed = parseProductUrl(url);
  if (!parsed) {
    throw new Error(`Could not parse URL: ${url}`);
  }

  const adapter = getSupplierAdapter(parsed.supplier);
  const identified = await adapter.identify({ url });
  const priceData = await adapter.getPrice(parsed.productId);

  const supplier = await getOrCreateSupplier(parsed.supplier, adapter);
  if (!supplier) {
    throw new Error(`Failed to create/get supplier: ${parsed.supplier}`);
  }

  const supplierProduct = await upsertSupplierProduct(
    supplier.id,
    parsed.supplier,
    identified.supplierProductId,
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

  if (!supplierProduct) {
    throw new Error('Failed to create/get supplier product');
  }

  await upsertCurrentPrice(supplierProduct.id, priceData);

  return {
    supplierProductId: identified.supplierProductId,
    canonicalName: identified.title,
    description: identified.description,
    brand: (identified.attributes?.brand as string) || null,
    images: identified.images,
    price: priceData.price,
    currency: priceData.currency,
    shippingCost: priceData.shippingCost,
    inStock: priceData.inStock,
    supplierId: supplier.id,
    supplierSlug: parsed.supplier,
  };
}

export async function searchAcrossSuppliers(
  query: string,
  suppliersToSearch?: SupplierSlug[],
): Promise<IngestionResult[]> {
  const supplierList = suppliersToSearch || (['mercadolibre', 'aliexpress'] as SupplierSlug[]);
  const results: IngestionResult[] = [];

  for (const supplierSlug of supplierList) {
    try {
      const adapter = getSupplierAdapter(supplierSlug);
      const searchResults = await adapter.search(query, { limit: 5 });

      for (const result of searchResults) {
        try {
          const supplier = await getOrCreateSupplier(supplierSlug, adapter);
          if (!supplier) continue;

          const supplierProduct = await upsertSupplierProduct(
            supplier.id,
            supplierSlug,
            result.supplierProductId,
            {
              title: result.title,
              description: null,
              images: result.imageUrl ? [result.imageUrl] : [],
              price: result.price,
              currency: result.currency,
              inStock: result.inStock,
              attributes: {},
            },
          );

          if (!supplierProduct) continue;

          await upsertCurrentPrice(supplierProduct.id, {
            price: result.price,
            currency: result.currency,
            shippingCost: 0,
            inStock: result.inStock,
            stockQuantity: null,
            deliveryDaysMin: null,
            deliveryDaysMax: null,
          });

          results.push({
            supplierProductId: result.supplierProductId,
            canonicalName: result.title,
            description: null,
            brand: null,
            images: result.imageUrl ? [result.imageUrl] : [],
            price: result.price,
            currency: result.currency,
            shippingCost: 0,
            inStock: result.inStock,
            supplierId: supplier.id,
            supplierSlug,
          });
        } catch {
          continue;
        }
      }
    } catch {
      continue;
    }
  }

  return results;
}

async function getOrCreateSupplier(
  slug: SupplierSlug,
  _adapter: SupplierAdapter,
) {
  const existing = await db
    .select()
    .from(suppliers)
    .where(eq(suppliers.slug, slug))
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  const names: Record<string, string> = {
    aliexpress: 'AliExpress',
    amazon: 'Amazon',
    mercadolibre: 'Mercado Libre',
    ebay: 'eBay',
    walmart: 'Walmart',
    shein: 'SHEIN',
    temu: 'Temu',
    costco: 'Costco',
    liverpool: 'Liverpool',
    palacio: 'Palacio de Hierro',
    tiktokshop: 'TikTok Shop',
    facebook: 'Facebook Marketplace',
    rappi: 'Rappi',
    didi: 'DiDi Store',
    shopify: 'Shopify Stores',
    homedepot: 'Home Depot',
    officedepot: 'Office Depot',
    sears: 'Sears',
    coppel: 'Coppel',
    sanborns: 'Sanborns',
  };

  const [created] = await db
    .insert(suppliers)
    .values({
      name: names[slug] || slug,
      slug,
      type: 'api',
    })
    .returning();

  return created;
}

async function upsertSupplierProduct(
  supplierId: string,
  _supplierSlug: string,
  supplierProductId: string,
  data: {
    title: string;
    description: string | null;
    images: string[];
    price: number;
    currency: string;
    inStock: boolean;
    attributes: Record<string, unknown>;
  },
) {
  const existing = await db
    .select()
    .from(supplierProducts)
    .where(eq(supplierProducts.supplierProductId, supplierProductId))
    .limit(1);

  if (existing.length > 0) {
    const existingRecord = existing[0];
    if (!existingRecord) return null;

    await db
      .update(supplierProducts)
      .set({
        rawData: data,
        lastSyncedAt: new Date(),
      })
      .where(eq(supplierProducts.id, existingRecord.id));

    return existingRecord;
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
    const existingRecord = existing[0];
    if (!existingRecord) return;

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
      .where(eq(currentPrices.id, existingRecord.id));
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
