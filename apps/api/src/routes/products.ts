import type { FastifyInstance } from 'fastify';
import { db, products, productVariants, productImages, offers } from '@pricehunt/db';
import { eq, desc } from 'drizzle-orm';

export async function productRoutes(app: FastifyInstance) {
  // GET /products/:id
  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const product = await db.query.products.findFirst({
      where: eq(products.id, id),
      with: {
        brand: true,
        category: true,
        variants: true,
        images: { orderBy: [desc(productImages.isPrimary), productImages.position] },
      },
    });

    if (!product) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Product not found' } });
    }

    // Get best offer
    const bestOffer = await db.query.offers.findFirst({
      where: eq(offers.productId, id),
      orderBy: [desc(offers.score)],
      with: { supplierProduct: { with: { supplier: true } } },
    });

    return { ...product, bestOffer };
  });

  // GET /products/:id/variants
  app.get('/:id/variants', async (request) => {
    const { id } = request.params as { id: string };

    const variants = await db.query.productVariants.findMany({
      where: eq(productVariants.productId, id),
    });

    return variants;
  });

  // GET /products/:id/images
  app.get('/:id/images', async (request) => {
    const { id } = request.params as { id: string };

    const images = await db.query.productImages.findMany({
      where: eq(productImages.productId, id),
      orderBy: [desc(productImages.isPrimary), productImages.position],
    });

    return images;
  });
}
