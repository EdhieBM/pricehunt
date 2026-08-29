# Guía de Setup del Ambiente - PriceHunt

## Requisitos Previos

### Software Necesario

| Software | Versión | Propósito |
|----------|---------|-----------|
| **Node.js** | 20+ LTS | Runtime |
| **pnpm** | 8+ | Package manager |
| **Docker** | 24+ | Containers |
| **Docker Compose** | v2 | Local services |
| **Git** | 2.40+ | Version control |
| **PostgreSQL** | 16 | Database (via Docker) |
| **Redis** | 7 | Cache (via Docker) |

### Cuentas Necesarias

| Servicio | Propósito | Costo |
|----------|-----------|-------|
| **GitHub** | Repository | Gratis |
| **Vercel** | Frontend deploy | Gratis (hobby) |
| **Hetzner** | Backend hosting | ~€5/mes |
| **Conekta** | Pagos | Pay per transaction |
| **OpenAI** | AI API | Pay per use |
| **Cloudflare** | CDN + DNS | Gratis |
| **Resend** | Email | Gratis (100/día) |
| **Sentry** | Error tracking | Gratis (5k/mes) |

---

## 1. Clonar el Repositorio

```bash
git clone https://github.com/your-org/pricehunt.git
cd pricehunt
```

## 2. Instalar Dependencias

```bash
# Instalar pnpm si no lo tienes
npm install -g pnpm

# Instalar dependencias
pnpm install
```

## 3. Configurar Variables de Entorno

```bash
# Copiar template
cp .env.example .env.local

# Editar con tus valores
nano .env.local
```

### Variables de Entorno Requeridas

```bash
# ============================================
# DATABASE
# ============================================
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/pricehunt"
DATABASE_POOL_SIZE=10

# ============================================
# REDIS
# ============================================
REDIS_URL="redis://localhost:6379"

# ============================================
# AUTH
# ============================================
JWT_SECRET="tu-jwt-secret-aqui-minimo-32-chars"
JWT_EXPIRES_IN="15m"
REFRESH_TOKEN_SECRET="tu-refresh-token-secret-aqui"
REFRESH_TOKEN_EXPIRES_IN="7d"

# ============================================
# PAYMENTS (Conekta)
# ============================================
CONEKTA_PRIVATE_KEY="key_xxxxx"
CONEKTA_PUBLIC_KEY="pub_xxxxx"
CONEKTA_WEBHOOK_SECRET="whsec_xxxxx"

# ============================================
# AI (OpenAI)
# ============================================
OPENAI_API_KEY="sk-xxxxx"

# ============================================
# EMAIL (Resend)
# ============================================
RESEND_API_KEY="re_xxxxx"
EMAIL_FROM="PriceHunt <noreply@pricehunt.mx>"

# ============================================
# STORAGE (Cloudflare R2)
# ============================================
R2_ACCOUNT_ID="your-account-id"
R2_ACCESS_KEY_ID="your-access-key"
R2_SECRET_ACCESS_KEY="your-secret-key"
R2_BUCKET_NAME="pricehunt-images"
R2_PUBLIC_URL="https://images.pricehunt.mx"

# ============================================
# MONITORING (Sentry)
# ============================================
SENTRY_DSN="https://xxxxx@sentry.io/xxxxx"
NEXT_PUBLIC_SENTRY_DSN="https://xxxxx@sentry.io/xxxxx"

# ============================================
# APP
# ============================================
NEXT_PUBLIC_APP_URL="http://localhost:3000"
API_URL="http://localhost:3001"
NODE_ENV="development"
```

## 4. Iniciar Servicios Locales

```bash
# Iniciar PostgreSQL y Redis
docker-compose up -d

# Verificar que estén corriendo
docker-compose ps
```

### Docker Compose (docker-compose.yml)

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: pricehunt-postgres
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: pricehunt
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: pricehunt-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  meilisearch:
    image: getmeili/meilisearch:v1.6
    container_name: pricehunt-meilisearch
    ports:
      - "7700:7700"
    environment:
      MEILI_MASTER_KEY: "your-master-key"
      MEILI_ENV: "development"
    volumes:
      - meilisearch_data:/meili_data

volumes:
  postgres_data:
  redis_data:
  meilisearch_data:
```

## 5. Configurar Base de Datos

```bash
# Generar migraciones
pnpm db:generate

# Ejecutar migraciones
pnpm db:migrate

# Poblar con datos de prueba
pnpm db:seed
```

## 6. Iniciar el Servidor de Desarrollo

```bash
# Iniciar todo (frontend + backend + workers)
pnpm dev

# O iniciar por separado
pnpm dev:web      # Frontend en http://localhost:3000
pnpm dev:api      # Backend en http://localhost:3001
pnpm dev:workers  # Workers en background
```

## 7. Verificar que Funciona

```bash
# Health check
curl http://localhost:3001/api/v1/health

# Debería retornar:
# {"status":"ok","version":"1.0.0","uptime":123}
```

---

## Estructura del Proyecto

```
pricehunt/
├── apps/
│   ├── web/                    # Frontend Next.js
│   │   ├── app/               # App Router pages
│   │   ├── components/        # React components
│   │   ├── lib/               # Utilities
│   │   └── public/            # Static assets
│   │
│   └── api/                    # Backend Fastify
│       ├── src/
│       │   ├── routes/        # API routes
│       │   ├── services/      # Business logic
│       │   ├── middleware/     # Auth, validation
│       │   └── utils/         # Helpers
│       └── tests/
│
├── packages/
│   ├── db/                     # Database schema + migrations
│   │   ├── src/
│   │   │   ├── schema.ts      # Drizzle schema
│   │   │   ├── migrations/    # SQL migrations
│   │   │   └── seed.ts        # Seed data
│   │   └── drizzle.config.ts
│   │
│   ├── ui/                     # Shared UI components
│   │   └── src/
│   │
│   ├── shared/                 # Shared types + utils
│   │   └── src/
│   │       ├── types/         # TypeScript types
│   │       ├── constants/     # App constants
│   │       └── utils/         # Utility functions
│   │
│   └── worker/                 # Background workers
│       └── src/
│           ├── crawlers/      # Crawler workers
│           ├── pricing/       # Price update workers
│           ├── orders/        # Order processing
│           └── tracking/      # Tracking workers
│
├── docker/
│   ├── docker-compose.yml     # Local development
│   └── docker-compose.prod.yml
│
├── docs/                       # Documentation
│   ├── api-spec.yaml
│   ├── erd-diagrams.md
│   ├── sequence-diagrams.md
│   └── architecture-diagrams.md
│
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── deploy.yml
│
├── turbo.json                  # Turborepo config
├── package.json
└── tsconfig.json
```

---

## Scripts Disponibles

```bash
# Development
pnpm dev                    # Start all services
pnpm dev:web                # Start frontend only
pnpm dev:api                # Start backend only
pnpm dev:workers            # Start workers only

# Build
pnpm build                  # Build all packages
pnpm build:web              # Build frontend
pnpm build:api              # Build backend

# Database
pnpm db:generate            # Generate migrations
pnpm db:migrate             # Run migrations
pnpm db:push                # Push schema changes
pnpm db:seed                # Seed database
pnpm db:studio              # Open Drizzle Studio

# Testing
pnpm test                   # Run all tests
pnpm test:watch             # Run tests in watch mode
pnpm test:coverage          # Run tests with coverage
pnpm test:e2e               # Run E2E tests

# Linting
pnpm lint                   # Lint all packages
pnpm lint:fix               # Fix lint errors
pnpm format                 # Format code

# Utilities
pnpm clean                  # Clean build artifacts
pnpm typecheck              # Type check all packages
```

---

## troubleshooting

### Problema: PostgreSQL no inicia

```bash
# Ver logs
docker-compose logs postgres

# Reiniciar
docker-compose restart postgres

# Si persiste, eliminar volumen y recrear
docker-compose down -v
docker-compose up -d
```

### Problema: Puerto 5432 ya en uso

```bash
# En Windows, detener servicio de PostgreSQL
net stop postgresql

# O cambiar puerto en docker-compose.yml
ports:
  - "5433:5432"
```

### Problema: Errores de migración

```bash
# Resetear base de datos
pnpm db:drop
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

### Problema: Errores de TypeScript

```bash
# Limpiar caches
pnpm clean
pnpm install
pnpm typecheck
```

---

## Producción

### Variables de Entorno Adicionales

```bash
# Production
NODE_ENV="production"
DATABASE_URL="postgresql://user:pass@host:5432/pricehunt"
REDIS_URL="redis://host:6379"

# Seguridad
JWT_SECRET="generar-secret-seguro-minimo-64-chars"
CORS_ORIGIN="https://pricehunt.mx"

# Monitoring
SENTRY_ENVIRONMENT="production"
SENTRY_RELEASE="1.0.0"
```

### Deploy con Docker

```bash
# Build images
docker-compose -f docker-compose.prod.yml build

# Deploy
docker-compose -f docker-compose.prod.yml up -d
```

### Deploy en Hetzner

```bash
# En el servidor
ssh root@your-server-ip

# Clonar repositorio
git clone https://github.com/your-org/pricehunt.git
cd pricehunt

# Configurar variables de entorno
cp .env.example .env
nano .env

# Instalar Docker
curl -fsSL https://get.docker.com | sh

# Iniciar servicios
docker-compose -f docker-compose.prod.yml up -d

# Configurar Nginx (reverse proxy)
# Ver docs/nginx-config.md
```

---

## Contribuir

1. Crear branch para feature
2. Hacer cambios
3. Ejecutar tests: `pnpm test`
4. Ejecutar lint: `pnpm lint`
5. Crear Pull Request

---

## Soporte

- **Issues:** GitHub Issues
- **Docs:** /docs
- **Slack:** #pricehunt-dev
