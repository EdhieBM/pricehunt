import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ingestFromUrl, searchAcrossSuppliers } from '@pricehunt/db';

const identifySchema = z.object({
  url: z.string().url().optional(),
  text: z.string().min(1).optional(),
}).refine((data) => data.url || data.text, {
  message: 'Either url or text is required',
});

const searchSchema = z.object({
  q: z.string().min(1),
  suppliers: z.string().optional(),
});

export async function productIngestionRoutes(app: FastifyInstance) {
  app.post('/identify', async (request, reply) => {
    const body = identifySchema.parse(request.body);

    if (!body.url) {
      return reply.status(400).send({
        error: 'Text-based identification not yet implemented. Please provide a URL.',
      });
    }

    try {
      const result = await ingestFromUrl(body.url);
      return { success: true, data: result };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return reply.status(422).send({ error: message });
    }
  });

  app.post('/search-suppliers', async (request, reply) => {
    const query = searchSchema.parse(request.query);
    const suppliersList = query.suppliers
      ? (query.suppliers.split(',') as any[])
      : undefined;

    try {
      const results = await searchAcrossSuppliers(query.q, suppliersList);
      return {
        success: true,
        query: query.q,
        total: results.length,
        data: results,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return reply.status(500).send({ error: message });
    }
  });
}
