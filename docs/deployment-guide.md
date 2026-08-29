# Guía de Deploy - PriceHunt

## Estrategia de Deploy

### Ambientes

| Ambiente | URL | Propósito | Deploy |
|----------|-----|-----------|--------|
| **Development** | localhost | Desarrollo local | Manual |
| **Staging** | staging.pricehunt.mx | QA y testing | Auto (PR merge) |
| **Production** | pricehunt.mx | Producción | Manual approval |

---

## 1. Deploy Frontend (Vercel)

### Configuración Inicial

```bash
# Instalar Vercel CLI
npm i -g vercel

# Login
vercel login

# Conectar repositorio
vercel link
```

### Variables de Entorno en Vercel

```bash
# En dashboard de Vercel > Settings > Environment Variables
NEXT_PUBLIC_API_URL=https://api.pricehunt.mx
NEXT_PUBLIC_APP_URL=https://pricehunt.mx
NEXT_PUBLIC_SENTRY_DSN=...
```

### Deploy Automático

Vercel deploya automáticamente cuando haces push a `main`:

```bash
git push origin main
# Vercel detecta cambios y deploya
```

### Deploy Manual

```bash
vercel --prod
```

---

## 2. Deploy Backend (Hetzner + Docker)

### Servidor Inicial (MVP)

**Especificaciones del servidor:**
- **Location:** Nuremberg o Helsinki
- **Type:** CPX21 (4 vCPU, 8GB RAM, 80GB SSD)
- **Costo:** ~€7/mes

### Setup del Servidor

```bash
# 1. Crear servidor en Hetzner Cloud Console
# 2. SSH al servidor
ssh root@your-server-ip

# 3. Actualizar sistema
apt update && apt upgrade -y

# 4. Instalar Docker
curl -fsSL https://get.docker.com | sh

# 5. Instalar Docker Compose
apt install docker-compose-plugin -y

# 6. Clonar repositorio
git clone https://github.com/your-org/pricehunt.git
cd pricehunt

# 7. Configurar variables de entorno
cp .env.example .env
nano .env

# 8. Iniciar servicios
docker compose -f docker-compose.prod.yml up -d

# 9. Verificar
docker compose ps
docker compose logs api
```

### Docker Compose Producción

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl
    depends_on:
      - api
    restart: always

  api:
    build:
      context: .
      dockerfile: apps/api/Dockerfile
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:${DB_PASSWORD}@postgres:5432/pricehunt
      - REDIS_URL=redis://redis:6379
    env_file:
      - .env
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: always
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  workers:
    build:
      context: .
      dockerfile: packages/worker/Dockerfile
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:${DB_PASSWORD}@postgres:5432/pricehunt
      - REDIS_URL=redis://redis:6379
    env_file:
      - .env
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: always

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: pricehunt
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: always

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: always

  meilisearch:
    image: getmeili/meilisearch:v1.6
    environment:
      MEILI_MASTER_KEY: ${MEILI_MASTER_KEY}
      MEILI_ENV: production
    volumes:
      - meilisearch_data:/meili_data
    restart: always

volumes:
  postgres_data:
  redis_data:
  meilisearch_data:
```

### Nginx Configuration

```nginx
# nginx/nginx.conf
worker_processes auto;

events {
    worker_connections 1024;
}

http {
    upstream api {
        server api:3001;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

    # SSL
    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;

    # Redirect HTTP to HTTPS
    server {
        listen 80;
        server_name api.pricehunt.mx;
        return 301 https://$server_name$request_uri;
    }

    # API Server
    server {
        listen 443 ssl http2;
        server_name api.pricehunt.mx;

        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;

        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

        # API routes
        location / {
            limit_req zone=api burst=20 nodelay;
            
            proxy_pass http://api;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }

        # Health check
        location /health {
            proxy_pass http://api;
            access_log off;
        }
    }
}
```

### SSL con Let's Encrypt

```bash
# Instalar Certbot
apt install certbot -y

# Obtener certificado
certbot certonly --standalone -a api.pricehunt.mx

# Los certificados estarán en:
# /etc/letsencrypt/live/api.pricehunt.mx/fullchain.pem
# /etc/letsencrypt/live/api.pricehunt.mx/privkey.pem

# Copiar a nginx
cp /etc/letsencrypt/live/api.pricehunt.mx/fullchain.pem ./nginx/ssl/
cp /etc/letsencrypt/live/api.pricehunt.mx/privkey.pem ./nginx/ssl/

# Auto-renewal
certbot renew --dry-run
```

---

## 3. CI/CD Pipeline

### GitHub Actions

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck

  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_DB: pricehunt_test
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm db:generate
      - run: pnpm db:migrate
      - run: pnpm test --coverage
      - uses: codecov/codecov-action@v3

  build:
    runs-on: ubuntu-latest
    needs: [lint, test]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
```

### Deploy Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy-staging:
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Staging
        run: |
          ssh ${{ secrets.STAGING_SERVER }} << 'EOF'
            cd /app
            git pull origin main
            docker compose -f docker-compose.prod.yml pull
            docker compose -f docker-compose.prod.yml up -d
            docker compose exec api pnpm db:migrate
          EOF

  deploy-production:
    runs-on: ubuntu-latest
    needs: deploy-staging
    environment: production
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Production
        run: |
          ssh ${{ secrets.PRODUCTION_SERVER }} << 'EOF'
            cd /app
            git pull origin main
            docker compose -f docker-compose.prod.yml pull
            docker compose -f docker-compose.prod.yml up -d
            docker compose exec api pnpm db:migrate
          EOF
```

---

## 4. Monitoreo en Producción

### Health Checks

```bash
# API Health
curl https://api.pricehunt.mx/health

# Response:
{
  "status": "ok",
  "version": "1.0.0",
  "uptime": 123456,
  "checks": {
    "database": "ok",
    "redis": "ok",
    "storage": "ok"
  }
}
```

### Sentry Setup

```typescript
// apps/api/src/sentry.ts
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  release: process.env.SENTRY_RELEASE,
  tracesSampleRate: 0.1,
});
```

### Grafana Dashboard

```json
{
  "dashboard": {
    "title": "PriceHunt API",
    "panels": [
      {
        "title": "Request Rate",
        "type": "graph",
        "targets": [{
          "expr": "rate(http_requests_total[5m])"
        }]
      },
      {
        "title": "Response Time",
        "type": "graph",
        "targets": [{
          "expr": "histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))"
        }]
      },
      {
        "title": "Error Rate",
        "type": "graph",
        "targets": [{
          "expr": "rate(http_requests_total{status=~'5..'}[5m])"
        }]
      }
    ]
  }
}
```

---

## 5. Backup Strategy

### PostgreSQL Backup

```bash
# Backup manual
docker compose exec postgres pg_dump -U postgres pricehunt > backup_$(date +%Y%m%d).sql

# Restore
docker compose exec postgres psql -U postgres pricehunt < backup_20240115.sql

# Automated daily backup (add to crontab)
0 2 * * * docker compose exec -T postgres pg_dump -U postgres pricehunt | gzip > /backups/pricehunt_$(date +\%Y\%m\%d).sql.gz
```

### Redis Backup

```bash
# Redis automatically saves to disk
# Configure in redis.conf:
# save 900 1
# save 300 10
# save 60 10000
```

---

## 6. Scaling

### Horizontal Scaling (App Servers)

```bash
# Add more app servers
docker compose -f docker-compose.prod.yml up -d --scale api=3

# Update nginx upstream
# nginx.conf
upstream api {
    server api_1:3001;
    server api_2:3001;
    server api_3:3001;
}
```

### Database Scaling

```bash
# Add read replica
# 1. Create new Hetzner server
# 2. Configure PostgreSQL replication
# 3. Update connection strings
DATABASE_URL="postgresql://postgres:pass@primary:5432/pricehunt"
DATABASE_REPLICA_URL="postgresql://postgres:pass@replica:5432/pricehunt"
```

### Cache Scaling

```bash
# Redis Sentinel for HA
# redis-sentinel.conf
sentinel monitor mymaster pricehunt-redis 6379 2
sentinel down-after-milliseconds mymaster 5000
sentinel failover-timeout mymaster 60000
```

---

## 7. Rollback

### Quick Rollback

```bash
# Rollback to previous version
git log --oneline -5  # Find commit hash
git checkout <commit-hash>

# Rebuild and deploy
docker compose -f docker-compose.prod.yml up -d --build
```

### Database Rollback

```bash
# If migration caused issues
pnpm db:migrate:undo

# Or restore from backup
docker compose exec postgres psql -U postgres pricehunt < backup_20240115.sql
```

---

## 8. Security Checklist

### Pre-Launch

- [ ] All secrets in environment variables
- [ ] SSL/TLS configured
- [ ] CORS configured correctly
- [ ] Rate limiting enabled
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (output encoding)
- [ ] CSRF protection enabled
- [ ] Security headers configured
- [ ] Dependencies audited (`pnpm audit`)
- [ ] Docker images scanned for vulnerabilities

### Ongoing

- [ ] Monitor Sentry for errors
- [ ] Review audit logs weekly
- [ ] Update dependencies monthly
- [ ] Rotate secrets quarterly
- [ ] Security training for team

---

## Troubleshooting

### API no responde

```bash
# Check logs
docker compose logs api

# Check if container is running
docker compose ps

# Restart API
docker compose restart api

# Check database connection
docker compose exec api pnpm db:ping
```

### High Memory Usage

```bash
# Check container stats
docker stats

# Restart containers
docker compose restart

# If persistent, increase server size
```

### SSL Certificate Issues

```bash
# Check certificate expiry
openssl x509 -enddate -noout -in /etc/letsencrypt/live/api.pricehunt.mx/fullchain.pem

# Renew
certbot renew

# Restart nginx
docker compose restart nginx
```

---

## Cost Summary (Production)

| Component | Monthly Cost |
|-----------|--------------|
| Hetzner CPX21 | €7 (~$8) |
| Hetzner DB CPX11 | €5 (~$6) |
| Vercel Pro | $20 |
| Cloudflare Pro | $20 |
| Domain | $1 |
| **Total** | **~$55/mes** |

Ascales a 100k usuarios:
| Component | Monthly Cost |
|-----------|--------------|
| Hetzner 3x CPX31 | €48 (~$53) |
| Hetzner DB CPX31 | €15 (~$17) |
| Vercel Pro | $20 |
| Cloudflare Business | $200 |
| Monitoring | $100 |
| **Total** | **~$390/mes** |
