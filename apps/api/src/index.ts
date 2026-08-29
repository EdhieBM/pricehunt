import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { env } from './utils/env';
import { healthRoutes } from './routes/health';
import { productRoutes } from './routes/products';
import { searchRoutes } from './routes/search';
import { checkoutRoutes } from './routes/checkout';
import { orderRoutes } from './routes/orders';
import { productIngestionRoutes } from './routes/ingestion';
import { matchingRoutes } from './routes/matching';
import { pricingRoutes } from './routes/pricing';

const server = Fastify({
  logger: {
    level: env.LOG_LEVEL,
    transport:
      env.NODE_ENV === 'development'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
  },
});

async function bootstrap() {
  // Plugins
  await server.register(cors, {
    origin: env.CORS_ORIGIN,
    credentials: true,
  });

  await server.register(helmet);

  await server.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  // Routes
  await server.register(healthRoutes, { prefix: '/api/v1' });
  await server.register(productRoutes, { prefix: '/api/v1/products' });
  await server.register(searchRoutes, { prefix: '/api/v1/search' });
  await server.register(checkoutRoutes, { prefix: '/api/v1/checkout' });
  await server.register(orderRoutes, { prefix: '/api/v1/orders' });
  await server.register(productIngestionRoutes, { prefix: '/api/v1/products' });
  await server.register(matchingRoutes, { prefix: '/api/v1/matching' });
  await server.register(pricingRoutes, { prefix: '/api/v1/pricing' });

  // Start
  try {
    await server.listen({ port: env.PORT, host: '0.0.0.0' });
    server.log.info(`Server running on port ${env.PORT}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

bootstrap();
