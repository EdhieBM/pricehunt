import type { FastifyInstance } from 'fastify';
import { db, orders, orderItems, shipments } from '@pricehunt/db';
import { eq } from 'drizzle-orm';

export async function orderRoutes(app: FastifyInstance) {
  // GET /orders
  app.get('/', async (request) => {
    const query = request.query as Record<string, string>;
    const page = parseInt(query.page || '1');
    const limit = Math.min(parseInt(query.limit || '20'), 100);

    // TODO: Get userId from auth token
    const userId = 'placeholder-user-id';

    const results = await db.query.orders.findMany({
      where: eq(orders.userId, userId),
      limit,
      offset: (page - 1) * limit,
      orderBy: [orders.createdAt],
      with: {
        items: true,
      },
    });

    return { orders: results };
  });

  // GET /orders/:id
  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const order = await db.query.orders.findFirst({
      where: eq(orders.id, id),
      with: {
        items: { with: { product: true, variant: true } },
        shipments: { with: { events: true } },
      },
    });

    if (!order) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Order not found' } });
    }

    return order;
  });

  // GET /orders/:id/tracking
  app.get('/:id/tracking', async (request, reply) => {
    const { id } = request.params as { id: string };

    const orderShipments = await db.query.shipments.findMany({
      where: eq(shipments.orderId, id),
      with: { events: true },
    });

    if (orderShipments.length === 0) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'No shipments found' } });
    }

    return { shipments: orderShipments };
  });

  // POST /orders/:id/cancel
  app.post('/:id/cancel', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { reason?: string };

    // TODO: Validate order can be cancelled
    // TODO: Cancel with supplier
    // TODO: Process refund

    return { message: 'Order cancellation requested', orderId: id };
  });
}
