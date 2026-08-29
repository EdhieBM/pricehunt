# Architecture Diagrams - PriceHunt

## 1. High-Level Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        WEB[Web App<br/>Next.js + Vercel]
        EXT[Browser Extension<br/>Fase 3]
        MOB[Mobile App<br/>Fase 4]
    end

    subgraph "Edge Layer"
        CF[Cloudflare<br/>CDN + DNS + DDoS]
    end

    subgraph "API Layer"
        LB[Load Balancer<br/>Nginx/HAProxy]
        API1[API Server 1<br/>Fastify + TypeScript]
        API2[API Server 2<br/>Fastify + TypeScript]
    end

    subgraph "Application Layer"
        PROD[Product Service]
        MATCH[Matching Engine]
        PRICE[Pricing Engine]
        ORDER[Order Service]
        CHECKOUT[Checkout Service]
        NOTIFY[Notification Service]
    end

    subgraph "Worker Layer"
        W1[Crawler Worker]
        W2[Price Update Worker]
        W3[Order Processing Worker]
        W4[Tracking Worker]
    end

    subgraph "Data Layer"
        PG[(PostgreSQL<br/>Primary)]
        PG_R[(PostgreSQL<br/>Replica)]
        REDIS[(Redis<br/>Cache + Queue)]
        MEILI[(Meilisearch<br/>Search)]
        R2[Cloudflare R2<br/>Object Storage]
    end

    subgraph "External Services"
        CONEKTA[Conekta<br/>Payments]
        OPENAI[OpenAI API<br/>AI/ML]
        SUP1[Supplier 1<br/>AliExpress]
        SUP2[Supplier 2<br/>Amazon]
        SUP3[Supplier 3<br/>MercadoLibre]
        EMAIL[Resend<br/>Email]
    end

    WEB --> CF
    EXT --> CF
    MOB --> CF
    CF --> LB
    LB --> API1
    LB --> API2
    
    API1 --> PROD
    API1 --> MATCH
    API1 --> PRICE
    API1 --> ORDER
    API1 --> CHECKOUT
    
    API2 --> PROD
    API2 --> MATCH
    API2 --> PRICE
    
    PROD --> PG
    MATCH --> PG
    PRICE --> PG
    ORDER --> PG
    CHECKOUT --> PG
    
    PROD --> REDIS
    MATCH --> REDIS
    PRICE --> REDIS
    ORDER --> REDIS
    
    PROD --> MEILI
    
    W1 --> REDIS
    W2 --> REDIS
    W3 --> REDIS
    W4 --> REDIS
    
    W1 --> SUP1
    W1 --> SUP2
    W1 --> SUP3
    W2 --> SUP1
    W2 --> SUP2
    W2 --> SUP3
    
    ORDER --> CONEKTA
    MATCH --> OPENAI
    NOTIFY --> EMAIL
    
    PROD --> R2
```

## 2. Data Flow Architecture

```mermaid
graph LR
    subgraph "Ingestion"
        A[URL/Image/Text] --> B[Product Ingestion]
        B --> C[Normalization]
        C --> D[Storage]
    end

    subgraph "Processing"
        D --> E[Product Matching]
        E --> F[Price Collection]
        F --> G[Price Normalization]
        G --> H[Final Landed Cost]
    end

    subgraph "Ranking"
        H --> I[Supplier Ranking]
        I --> J[Our Pricing Engine]
        J --> K[Best Offer Selection]
    end

    subgraph "Presentation"
        K --> L[Product Page]
        L --> M[Checkout]
        M --> N[Order]
    end

    subgraph "Fulfillment"
        N --> O[Order Routing]
        O --> P[Supplier Purchase]
        P --> Q[Fulfillment]
        Q --> R[Tracking]
        R --> S[Customer]
    end

    style A fill:#e1f5fe
    style S fill:#e8f5e9
    style K fill:#fff3e0
    style M fill:#fce4ec
```

## 3. Microservices Decomposition (Future)

```mermaid
graph TB
    subgraph "Frontend"
        WEB[Next.js Web]
    end

    subgraph "API Gateway"
        GW[API Gateway<br/>Rate Limiting + Auth]
    end

    subgraph "Core Services"
        US[User Service]
        PS[Product Service]
        MS[Matching Service]
        PR[Pricing Service]
        OS[Order Service]
        CS[Checkout Service]
        SS[Shipping Service]
        TS[Tax Service]
    end

    subgraph "Background Services"
        CW[Crawler Service]
        PU[Price Update Service]
        OP[Order Processing Service]
        TK[Tracking Service]
        NS[Notification Service]
    end

    subgraph "Data Services"
        SEARCH[Search Service]
        ANALYTICS[Analytics Service]
        CACHE[Cache Service]
    end

    subgraph "Infrastructure"
        PG[(PostgreSQL)]
        REDIS[(Redis)]
        MQ[Message Queue<br/>BullMQ/Kafka]
        R2[Object Storage]
    end

    WEB --> GW
    GW --> US
    GW --> PS
    GW --> MS
    GW --> PR
    GW --> OS
    GW --> CS
    GW --> SS
    GW --> TS

    PS --> PG
    MS --> PG
    PR --> PG
    OS --> PG
    CS --> PG

    PS --> REDIS
    MS --> REDIS
    PR --> REDIS

    CW --> MQ
    PU --> MQ
    OP --> MQ
    TK --> MQ
    NS --> MQ

    CW --> SEARCH
    PS --> SEARCH

    ANALYTICS --> PG
```

## 4. Infrastructure Topology (MVP)

```mermaid
graph TB
    subgraph "External"
        USERS[Users]
        DNS[Cloudflare DNS]
    end

    subgraph "Edge"
        CDN[Cloudflare CDN]
        CF_PAGES[Cloudflare Pages<br/>Frontend]
    end

    subgraph "Hetzner VPS - App Server"
        NGINX[Nginx<br/>Reverse Proxy]
        NODE[Node.js<br/>Fastify API]
        WORKER[BullMQ Workers]
        REDIS[Redis<br/>Cache + Queue]
    end

    subgraph "Hetzner VPS - DB Server"
        PG[(PostgreSQL 16)]
    end

    subgraph "External Services"
        CONEKTA[Conekta]
        OPENAI[OpenAI]
        RESEND[Resend]
        SENTRY[Sentry]
    end

    USERS --> DNS
    DNS --> CDN
    CDN --> CF_PAGES
    CF_PAGES --> NGINX
    NGINX --> NODE
    NGINX --> REDIS
    NODE --> PG
    NODE --> REDIS
    WORKER --> PG
    WORKER --> REDIS
    WORKER --> CONEKTA
    NODE --> OPENAI
    NODE --> RESEND
    NODE --> SENTRY
```

## 5. Infrastructure Topology (100k Users)

```mermaid
graph TB
    subgraph "External"
        USERS[Users]
        DNS[Cloudflare DNS]
    end

    subgraph "Edge"
        CDN[Cloudflare CDN]
        PAGES[Cloudflare Pages]
    end

    subgraph "Load Balancer"
        LB[Nginx/HAProxy<br/>Load Balancer]
    end

    subgraph "App Servers"
        APP1[App Server 1<br/>API + Web]
        APP2[App Server 2<br/>API + Web]
    end

    subgraph "Worker Servers"
        W1[Worker Server 1<br/>Crawler + Pricing]
        W2[Worker Server 2<br/>Order Processing]
    end

    subgraph "Database Cluster"
        PG_P[(PostgreSQL<br/>Primary)]
        PG_R1[(PostgreSQL<br/>Replica 1)]
        PG_R2[(PostgreSQL<br/>Replica 2)]
    end

    subgraph "Cache + Queue"
        REDIS_M[(Redis<br/>Master)]
        REDIS_S[(Redis<br/>Sentinel)]
    end

    subgraph "Search"
        MEILI[(Meilisearch<br/>Cluster)]
    end

    subgraph "Object Storage"
        R2[Cloudflare R2]
    end

    subgraph "External Services"
        CONEKTA[Conekta]
        OPENAI[OpenAI]
        RESEND[Resend]
        SENTRY[Sentry]
        GRAFANA[Grafana Cloud]
    end

    USERS --> DNS
    DNS --> CDN
    CDN --> PAGES
    CDN --> LB
    LB --> APP1
    LB --> APP2
    
    APP1 --> PG_P
    APP2 --> PG_P
    PG_P --> PG_R1
    PG_P --> PG_R2
    
    APP1 --> REDIS_M
    APP2 --> REDIS_M
    W1 --> REDIS_M
    W2 --> REDIS_M
    
    APP1 --> MEILI
    APP2 --> MEILI
    
    W1 --> CONEKTA
    W2 --> CONEKTA
    APP1 --> OPENAI
    APP1 --> RESEND
    APP1 --> SENTRY
    APP1 --> GRAFANA
```

## 6. Security Architecture

```mermaid
graph TB
    subgraph "External"
        USER[User]
        ATTACKER[Attacker]
    end

    subgraph "Edge Security"
        CF_DDoS[Cloudflare DDoS Protection]
        CF_WAF[Cloudflare WAF]
        CF_RATE[Rate Limiting]
    end

    subgraph "Application Security"
        AUTH[Authentication<br/>JWT + Refresh]
        AUTHZ[Authorization<br/>RBAC]
        CORS[CORS Policy]
        CSP[Content Security Policy]
    end

    subgraph "Data Security"
        ENC_REST[Encryption at Rest<br/>AES-256]
        ENC_TRANS[Encryption in Transit<br/>TLS 1.3]
        PII[PII Encryption]
        TOKENS[Payment Tokenization]
    end

    subgraph "Infrastructure Security"
        FW[Firewall<br/>Hetzner/AWS]
        SSH[SSH Key Auth]
        FAIL2[Fail2ban]
        SECRETS[Secrets Management<br/>Vault/SOPS]
    end

    subgraph "Monitoring Security"
        AUDIT[Audit Logging]
        ALERTS[Security Alerts]
        FRAUD[Fraud Detection]
    end

    USER --> CF_DDoS
    ATTACKER -.-> CF_DDoS
    CF_DDoS --> CF_WAF
    CF_WAF --> CF_RATE
    CF_RATE --> AUTH
    AUTH --> AUTHZ
    AUTHZ --> CORS
    CORS --> CSP
    
    CSP --> ENC_REST
    ENC_REST --> ENC_TRANS
    ENC_TRANS --> PII
    PII --> TOKENS
    
    TOKENS --> FW
    FW --> SSH
    SSH --> FAIL2
    FAIL2 --> SECRETS
    
    SECRETS --> AUDIT
    AUDIT --> ALERTS
    ALERTS --> FRAUD
```

## 7. Monitoring Architecture

```mermaid
graph TB
    subgraph "Applications"
        API[API Servers]
        WORKERS[Workers]
        DB[PostgreSQL]
        REDIS[Redis]
    end

    subgraph "Collection"
        PROM[Prometheus<br/>Metrics]
        LOKI[Loki<br/>Logs]
        TEMPO[Tempo<br/>Traces]
        SENTRY_ERROR[Sentry<br/>Errors]
    end

    subgraph "Processing"
        PROM_RULES[Prometheus Rules<br/>Alerting]
        GRAFANA[Grafana<br/>Dashboards]
    end

    subgraph "Alerting"
        SLACK[Slack]
        EMAIL[Email]
        PAGER[PagerDuty]
    end

    subgraph "Business Metrics"
        METRICS[Custom Metrics<br/>Conversion, Savings, etc.]
    end

    API --> PROM
    API --> LOKI
    API --> TEMPO
    API --> SENTRY_ERROR
    
    WORKERS --> PROM
    WORKERS --> LOKI
    
    DB --> PROM
    REDIS --> PROM
    
    PROM --> PROM_RULES
    PROM_RULES --> SLACK
    PROM_RULES --> EMAIL
    PROM_RULES --> PAGER
    
    PROM --> GRAFANA
    LOKI --> GRAFANA
    TEMPO --> GRAFANA
    
    METRICS --> GRAFANA
```

## 8. CI/CD Pipeline

```mermaid
graph LR
    subgraph "Development"
        DEV[Developer]
        GIT[Git Push]
    end

    subgraph "CI Pipeline"
        LINT[Lint]
        TEST[Test]
        BUILD[Build]
        SECURITY[Security Scan]
    end

    subgraph "CD Pipeline"
        STAGING[Deploy to Staging]
        E2E[E2E Tests]
        APPROVE[Manual Approval]
        PROD[Deploy to Production]
    end

    subgraph "Post-Deploy"
        HEALTH[Health Check]
        MONITOR[Monitor]
        ROLLBACK[Rollback if Failed]
    end

    DEV --> GIT
    GIT --> LINT
    LINT --> TEST
    TEST --> BUILD
    BUILD --> SECURITY
    SECURITY --> STAGING
    STAGING --> E2E
    E2E --> APPROVE
    APPROVE --> PROD
    PROD --> HEALTH
    HEALTH --> MONITOR
    HEALTH -.->|Failed| ROLLBACK
```

## Resumen de Capas

| Capa | Tecnología | Propósito |
|------|------------|-----------|
| **Edge** | Cloudflare | CDN, DDoS, DNS, SSL |
| **Frontend** | Next.js (Vercel/Pages) | UI, SSR, SEO |
| **API** | Fastify (Node.js) | REST API |
| **Application** | TypeScript | Business logic |
| **Workers** | BullMQ + Node.js | Background jobs |
| **Database** | PostgreSQL | Persistent storage |
| **Cache** | Redis | Cache + Queue |
| **Search** | Meilisearch | Full-text search |
| **Storage** | Cloudflare R2 | Images, assets |
| **Monitoring** | Sentry + Grafana | Errors + Metrics |
