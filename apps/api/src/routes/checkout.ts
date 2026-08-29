import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

const checkoutItemSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid(),
  supplierProductId: z.string().uuid(),
  quantity: z.number().int().min(1).max(10),
});

const addressSchema = z.object({
  street: z.string().min(1),
  street2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().min(1),
  postalCode: z.string().min(5),
  country: z.string().length(2).default('MX'),
  phone: z.string().optional(),
});

const checkoutSchema = z.object({
  items: z.array(checkoutItemSchema).min(1),
  shippingAddress: addressSchema,
  email: z.string().email(),
  phone: z.string().optional(),
  createAccount: z.boolean().default(false),
  couponCode: z.string().optional(),
});

export async function checkoutRoutes(app: FastifyInstance) {
  // POST /checkout
  app.post('/', async (request, reply) => {
    const body = checkoutSchema.safeParse(request.body);

    if (!body.success) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid checkout data',
          details: body.error.flatten(),
        },
      });
    }

    const { items, shippingAddress, email } = body.data;

    // TODO: Validate stock and prices with suppliers
    // TODO: Create order with status pending_payment
    // TODO: Authorize payment with Conekta
    // TODO: Return checkout token

    // Placeholder response
    return {
      checkoutToken: crypto.randomUUID(),
      items: items.map((item) => ({
        ...item,
        productName: 'Product', // TODO: fetch from DB
        variantName: 'Default',
        unitPrice: { amount: 0, currency: 'MXN' },
        totalPrice: { amount: 0, currency: 'MXN' },
      })),
      subtotal: { amount: 0, currency: 'MXN' },
      shipping: { amount: 0, currency: 'MXN' },
      tax: { amount: 0, currency: 'MXN' },
      total: { amount: 0, currency: 'MXN' },
      paymentMethods: [
        { type: 'card', name: 'Tarjeta de crédito/débito' },
        { type: 'oxxo', name: 'OXXO' },
        { type: 'spei', name: 'SPEI/Transferencia' },
      ],
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    };
  });

  // POST /checkout/:checkout_token/confirm
  app.post('/:checkoutToken/confirm', async (request, reply) => {
    const { checkoutToken } = request.params as { checkoutToken: string };

    // TODO: Validate checkout token
    // TODO: Process payment with Conekta
    // TODO: Purchase from supplier
    // TODO: Return order confirmation

    return {
      orderId: crypto.randomUUID(),
      status: 'confirmed',
      total: { amount: 0, currency: 'MXN' },
      estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };
  });
}
