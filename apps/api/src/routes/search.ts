import type { FastifyInstance } from 'fastify';
import { db, products, currentPrices, supplierProducts, brands } from '@pricehunt/db';
import { eq, sql, and, gte, lte } from 'drizzle-orm';

export async function searchRoutes(app: FastifyInstance) {
  // GET /search?q=...&brand=...&category=...&min_price=...&max_price=...&in_stock=...&page=...&limit=...
  app.get('/', async (request) => {
    const query = request.query as Record<string, string>;

    const searchQuery = query.q || '';
    const brand = query.brand;
    const minPrice = query.min_price ? parseFloat(query.min_price) : undefined;
    const maxPrice = query.max_price ? parseFloat(query.max_price) : undefined;
    const inStock = query.in_stock === 'true';
    const page = parseInt(query.page || '1');
    const limit = Math.min(parseInt(query.limit || '20'), 100);
    const offset = (page - 1) * limit;

    // Build conditions
    const conditions = [eq(products.isActive, true)];

    if (searchQuery) {
      conditions.push(
        sql`${products.canonicalName} ILIKE ${'%' + searchQuery + '%'}`,
      );
    }

    if (brand) {
      conditions.push(eq(brands.slug, brand));
    }

    if (minPrice !== undefined) {
      conditions.push(gte(currentPrices.finalPrice, minPrice.toString()));
    }

    if (maxPrice !== undefined) {
      conditions.push(lte(currentPrices.finalPrice, maxPrice.toString()));
    }

    if (inStock) {
      conditions.push(eq(currentPrices.inStock, true));
    }

    const whereClause = and(...conditions);

    // Get products
    const results = await db
      .select({
        id: products.id,
        canonicalName: products.canonicalName,
        slug: products.slug,
        brandName: brands.name,
        brandSlug: brands.slug,
        bestPrice: currentPrices.finalPrice,
        inStock: currentPrices.inStock,
      })
      .from(products)
      .leftJoin(brands, eq(products.brandId, brands.id))
      .leftJoin(supplierProducts, eq(products.id, supplierProducts.productId))
      .leftJoin(currentPrices, eq(supplierProducts.id, currentPrices.supplierProductId))
      .where(whereClause)
      .limit(limit)
      .offset(offset);

    // Get total count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(products)
      .leftJoin(brands, eq(products.brandId, brands.id))
      .leftJoin(supplierProducts, eq(products.id, supplierProducts.productId))
      .leftJoin(currentPrices, eq(supplierProducts.id, currentPrices.supplierProductId))
      .where(whereClause);

    const total = countResult?.count || 0;

    return {
      query: searchQuery,
      total,
      page,
      limit,
      results,
    };
  });
}
