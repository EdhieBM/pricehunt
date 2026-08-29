import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ingestFromUrl, searchAcrossSuppliers } from '@pricehunt/db';
import { Queue } from 'bullmq';
import Redis from 'ioredis';

const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
  enableOfflineQueue: false,
});

const ingestionQueue = new Queue('product-ingestion', { connection });
const matchingQueue = new Queue('product-matching', { connection });

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

const ingestSchema = z.object({
  url: z.string().url(),
  supplier: z.string().optional(),
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

  app.post('/ingest', async (request, reply) => {
    const body = ingestSchema.parse(request.body);

    const job = await ingestionQueue.add('ingest-product', {
      url: body.url,
      supplierSlug: body.supplier,
    }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: 100,
      removeOnFail: 50,
    });

    return {
      success: true,
      jobId: job.id,
      message: 'Product ingestion queued',
    };
  });

  app.post('/match/:supplierProductId', async (request, reply) => {
    const { supplierProductId } = request.params as { supplierProductId: string };
    const body = request.body as {
      title: string;
      brand?: string;
      gtin?: string;
      attributes?: Record<string, unknown>;
    };

    const job = await matchingQueue.add('match-product', {
      supplierProductId,
      title: body.title,
      brand: body.brand,
      gtin: body.gtin,
      attributes: body.attributes,
    }, {
      attempts: 2,
      backoff: { type: 'exponential', delay: 3000 },
      removeOnComplete: 100,
      removeOnFail: 50,
    });

    return {
      success: true,
      jobId: job.id,
      message: 'Matching queued',
    };
  });
}
