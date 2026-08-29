import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { calculatePrice, selectStrategy } from '@pricehunt/db';

const calculateSchema = z.object({
  supplierCost: z.number().positive(),
  shippingCost: z.number().min(0).default(0),
  taxAmount: z.number().min(0).default(0),
  currency: z.string().default('USD'),
  competitorPrice: z.number().positive().optional(),
  strategy: z.enum([
    'auto',
    'competitor_minus_1',
    'competitor_percent',
    'minimum_margin',
    'match_competitor',
  ]).default('auto'),
  minMarginPercentage: z.number().min(0).max(1).optional(),
});

const selectStrategySchema = z.object({
  ourCost: z.number().positive(),
  competitorPrice: z.number().positive().optional(),
});

export async function pricingRoutes(app: FastifyInstance) {
  app.post('/calculate', async (request) => {
    const body = calculateSchema.parse(request.body);

    let strategy = body.strategy;
    if (strategy === 'auto') {
      strategy = selectStrategy(
        !!body.competitorPrice,
        body.supplierCost,
        body.competitorPrice,
      ) as typeof strategy;
    }

    const result = calculatePrice({
      supplierCost: body.supplierCost,
      currency: body.currency,
      shippingCost: body.shippingCost,
      taxAmount: body.taxAmount,
      competitorPrice: body.competitorPrice,
      strategy,
      minMarginPercentage: body.minMarginPercentage,
    });

    return { success: true, data: result };
  });

  app.post('/select-strategy', async (request) => {
    const body = selectStrategySchema.parse(request.body);

    const strategy = selectStrategy(
      !!body.competitorPrice,
      body.ourCost,
      body.competitorPrice,
    );

    return { success: true, data: { strategy } };
  });
}
