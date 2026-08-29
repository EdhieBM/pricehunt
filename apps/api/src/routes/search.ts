import type { FastifyInstance } from 'fastify';
import { db, products, currentPrices, supplierProducts, brands, searchProducts } from '@pricehunt/db';
import type { MeiliProduct } from '@pricehunt/db';
import { eq, sql, and, gte, lte } from 'drizzle-orm';

export async function searchRoutes(app: FastifyInstance) {
  app.get('/', async (request) => {
    const query = request.query as Record<string, string>;

    const searchQuery = query.q || '';
    const brand = query.brand;
    const minPrice = query.min_price ? parseFloat(query.min_price) : undefined;
    const maxPrice = query.max_price ? parseFloat(query.max_price) : undefined;
    const inStock = query.in_stock === 'true';
    const page = parseInt(query.page || '1');
    const limit = Math.min(parseInt(query.limit || '20'), 100);

    if (searchQuery) {
      try {
        const filterParts: string[] = [];
        if (brand) filterParts.push(`supplier = "${brand}"`);
        if (inStock) filterParts.push('inStock = true');

        const meiliResults = await searchProducts(searchQuery, {
          filters: filterParts.length > 0 ? filterParts : undefined,
          limit,
          offset: (page - 1) * limit,
        });

        const enriched = await Promise.all(
          meiliResults.hits.map(async (hit: MeiliProduct) => {
            const [priceRow] = await db
              .select({ finalPrice: currentPrices.finalPrice, inStock: currentPrices.inStock })
              .from(supplierProducts)
              .innerJoin(currentPrices, eq(supplierProducts.id, currentPrices.supplierProductId))
              .where(eq(supplierProducts.id, hit.id))
              .limit(1);

            return {
              id: hit.id,
              canonicalName: hit.title,
              slug: hit.slug,
              brandName: hit.brand,
              bestPrice: priceRow?.finalPrice || hit.price?.toString() || null,
              inStock: priceRow?.inStock ?? hit.inStock ?? true,
              imageUrl: hit.imageUrl,
            };
          }),
        );

        let filtered = enriched;
        if (minPrice !== undefined) {
          filtered = filtered.filter((r) => {
            const p = r.bestPrice ? parseFloat(r.bestPrice) : 0;
            return p >= minPrice;
          });
        }
        if (maxPrice !== undefined) {
          filtered = filtered.filter((r) => {
            const p = r.bestPrice ? parseFloat(r.bestPrice) : Infinity;
            return p <= maxPrice;
          });
        }

        return {
          query: searchQuery,
          total: meiliResults.total || filtered.length,
          page,
          limit,
          results: filtered,
          source: 'meilisearch',
        };
      } catch {
        // Fall through to PostgreSQL
      }
    }

    const offset = (page - 1) * limit;
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
      source: 'postgresql',
    };
  });
}
