import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { calculateMatch, findBestMatch } from '@pricehunt/db';

const matchSchema = z.object({
  productA: z.object({
    title: z.string(),
    brand: z.string().nullable().optional(),
    gtin: z.string().nullable().optional(),
    attributes: z.record(z.unknown()).optional(),
  }),
  productB: z.object({
    title: z.string(),
    brand: z.string().nullable().optional(),
    gtin: z.string().nullable().optional(),
    attributes: z.record(z.unknown()).optional(),
  }),
});

const findMatchSchema = z.object({
  target: z.object({
    title: z.string(),
    brand: z.string().nullable().optional(),
    gtin: z.string().nullable().optional(),
    attributes: z.record(z.unknown()).optional(),
  }),
  candidates: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      brand: z.string().nullable().optional(),
      gtin: z.string().nullable().optional(),
      attributes: z.record(z.unknown()).optional(),
    }),
  ),
});

export async function matchingRoutes(app: FastifyInstance) {
  app.post('/compare', async (request) => {
    const body = matchSchema.parse(request.body);

    const result = calculateMatch(
      {
        title: body.productA.title,
        brand: body.productA.brand || null,
        gtin: body.productA.gtin || null,
        attributes: body.productA.attributes || {},
      },
      {
        title: body.productB.title,
        brand: body.productB.brand || null,
        gtin: body.productB.gtin || null,
        attributes: body.productB.attributes || {},
      },
    );

    return { success: true, data: result };
  });

  app.post('/find-best', async (request) => {
    const body = findMatchSchema.parse(request.body);

    const result = findBestMatch(
      {
        title: body.target.title,
        brand: body.target.brand || null,
        gtin: body.target.gtin || null,
        attributes: body.target.attributes || {},
      },
      body.candidates.map((c) => ({
        id: c.id,
        title: c.title,
        brand: c.brand || null,
        gtin: c.gtin || null,
        attributes: c.attributes || {},
      })),
    );

    return {
      success: true,
      data: result,
      hasMatch: result !== null,
    };
  });
}
