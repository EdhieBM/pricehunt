# PLANIFICACIÓN COMPLETA — PLATAFORMA DE COMERCIO ALGORÍTMICO

---

## 1. EXECUTIVE SUMMARY

**Nombre del proyecto:** PriceHunt (nombre provisional)
**Mercado inicial:** México
**Propuesta de valor:** Ser la capa que el usuario consulta antes de comprar, garantizando que si existe una forma legítima de conseguir un producto más barato, nuestro sistema la encuentre.

**Métrica North Star:** Average Customer Savings (ahorro promedio vs. alternativa de referencia)

**Modelo de negocio:** Margen mínimo por transacción + comisiones de proveedores + eventualmente membresía premium.

**Stack recomendado:** Next.js + TypeScript (Node.js) + PostgreSQL + Redis + BullMQ + Meilisearch

**Arquitectura:** Modular monolith con workers separados, migrable a microservicios.

**MVP estimado:** 8-12 semanas, ~$2,000-4,000 USD/mes en infraestructura.

**Riesgo principal:** Sostenibilidad de márgenes extremadamente bajos. Mitigación: volumen + eficiencia operativa + eventualmente acuerdos directos con proveedores.

---

## 2. DEFINICIÓN EXACTA DEL PRODUCTO

### Propuesta de valor
Una plataforma de comercio que identifica productos desde cualquier fuente (TikTok, URLs, imágenes, búsqueda textual), los compara en múltiples proveedores, calcula el precio final real (producto + envío + impuestos + aranceles), y permite al usuario comprar al menor costo posible desde una interfaz unificada.

### Usuario objetivo
- **Primario:** Compradores mexicanos de 18-45 años que buscan ofertas en redes sociales (especialmente TikTok) y quieren comprar productos sin pagar de más.
- **Secundario:** Compradores de marketplaces que quieren verificar si están obteniendo el mejor precio.
- **Terciario:** Compradores de productos específicos que necesitan comparar entre AliExpress, Amazon, Mercado Libre, etc.

### Flujo principal
```
TikTok/Internet → URL/imagen/búsqueda → Product ID → Matching → Candidates → Price Collection → Normalization → Shipping → Taxes → Landed Cost → Supplier Ranking → Our Price → Checkout → Order → Purchase → Fulfillment → Tracking → Customer
```

### Flujo alternativo
1. Usuario busca por texto → resultados → selección → mismo flujo
2. Usuario sube imagen → reverse search → identificación → mismo flujo
3. Usuario pega URL de TikTok → extracción de producto → mismo flujo

### MVP (Mínimo Viable Productile)
- Pegar URL de producto (cualquier e-commerce) → identificar → buscar ofertas equivalentes → mostrar mejor precio → checkout → orden
- Soporte inicial: URLs de TikTok Shop, AliExpress, Amazon México
- 1 fuente de datos por producto (no necesariamente la mejor)
- Checkout básico con Stripe o Conekta
- Sin inventario propio
- Envío desde proveedores

### Versión 2
- Búsqueda por imagen (CLIP/perceptual hash)
- Más fuentes de datos
- Shipping engine real
- Cálculo de impuestos
- Admin panel básico

### Versión 3
- Extensión de navegador
- App móvil
- Múltiples proveedores por pedido
- Acuerdos directos con proveedores
- Programa de afiliados

### Versión 4
- Red de compra inteligente
- Negociación directa con fabricantes
- Predictive pricing
- Expansión LATAM

### Qué NO debemos construir inicialmente
- Marketplace tradicional
- Inventario propio
- Logística propia
- Redes sociales
- Contenido de video
- App móvil nativa
- Sistema de afiliados complejo

### Qué debe quedar preparado desde el principio
- Extensibilidad de fuentes de datos
- Schema de precios multi-proveedor
- Sistema de matching expandible
- API-first architecture
- Multi-moneda preparado
- Multi-idioma preparado

---

## 3. QUÉ HACE DIFERENTE AL MODELO

### Diferenciadores clave

| Aspecto | Competidores | Nosotros |
|---------|--------------|----------|
| **Objetivo** | Maximizar margen | Minimizar precio final |
| **Fuentes** | Una fuente | Múltiples fuentes |
| **Comparación** | Precios visibles | Precio final real (landing cost) |
| **Matching** | Búsqueda básica | Matching multimodal (texto + imagen + atributos) |
| **Transparencia** | Ocultan costos | Mostramos el costo real |
| **Velocidad** | Manual | Automático y algorítmico |

### Ventaja competitiva sostenible
1. **Data de matching:** Con el tiempo, acumulamos la base de datos de matching producto-proveedor más grande.
2. **Eficiencia de pricing:** Nuestro algoritmo se vuelve más inteligente con cada transacción.
3. **Relaciones con proveedores:** A mayor volumen, mejores acuerdos directos.
4. **Confianza del usuario:** "Si existe una forma más barata, este sistema la encuentra."

### Por qué no somos un comparador
Un comparador muestra precios de múltiples tiendas. Nosotros decidimos dinámicamente la mejor fuente y vendemos directamente. La experiencia es: producto → precio → comprar. No: producto → ver 10 tiendas → elegir.

---

## 4. ARQUITECTURA CONCEPTUAL

### Modelo mental del sistema

```
┌─────────────────────────────────────────────────────────────┐
│                    CAPA DE USUARIO                          │
│  Web App / Extensión / API                                   │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                CAPA DE ORQUESTACIÓN                         │
│  Product Identification → Matching → Pricing → Checkout     │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                CAPA DE DATOS                                │
│  Product DB → Price Cache → Match Cache → Order History     │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                CAPA DE FUENTES                              │
│  AliExpress │ Amazon │ Mercado Libre │ Proveedores │ Feeds  │
└─────────────────────────────────────────────────────────────┘
```

### Principios arquitectónicos
1. **CQRS-lite:** Lecturas y escrituras con modelos ligeramente diferentes
2. **Event sourcing para precios:** Cada cambio de precio es un evento
3. **Caching agresivo:** Precios cacheados con TTL corto
4. **Graceful degradation:** Si una fuente falla, usar alternativas
5. **Idempotency:** Todas las operaciones deben ser idempotentes
6. **Audit trail:** Cada precio mostrado debe ser reproducible

---

## 5. ARQUITECTURA TÉCNICA

### Decisión: Modular Monolith + Workers

**Por qué NO microservicios inicialmente:**
- Complejidad operativa excesiva para MVP
- Comunicación inter-servicio innecesaria
- Dificultad de deploy y debugging
- Overhead de red innecesario
- No tenemos equipo grande

**Por qué NO monolito tradicional:**
- Necesitamos workers separados para crawling
- Precios deben actualizarse independientemente
- Scraping puede ser intensivo en CPU
- Necesitamos escalabilidad independiente

**Por qué Modular Monolith:**
- Deploy simple
- Compartir tipos y validaciones
- Transacciones ACID cuando sea necesario
- Fácil de debuggear
- Fácil de refactorizar a microservicios después

### Evolución por escala

| Usuarios | Arquitectura | Servidores |
|----------|--------------|------------|
| MVP | Modular monolith | 1-2 |
| 10k | Monolith + 2 workers | 3-4 |
| 100k | Monolith + workers + read replicas | 6-10 |
| 1M | Extracción a servicios críticos | 15-25 |
| 10M | Microservicios selectivos | 30+ |

### Cómo escalar de MVP a 10M usuarios

**Fase 1 (MVP):** Todo en un monolith con workers
**Fase 2 (10k-100k):** Separar crawler y pricing engine
**Fase 3 (100k-1M):** Separar checkout y payments
**Fase 4 (1M+):** Microservicios para componentes críticos

---

## 6. COMPONENTES DEL SISTEMA

### Componentes core

| Componente | Descripción | Prioridad |
|------------|-------------|-----------|
| **Product Service** | CRUD de productos, variantes, atributos | P0 |
| **Product Ingestion** | Recepción y normalización de productos desde fuentes | P0 |
| **Product Matching** | Identificación y comparación de productos entre fuentes | P0 |
| **Price Engine** | Cálculo de precio final y estrategia de pricing | P0 |
| **Order Service** | Gestión de órdenes, checkout, pagos | P0 |
| **Supplier Adapter** | Integración con cada proveedor | P0 |
| **Search Engine** | Búsqueda de productos (texto, filtros) | P1 |
| **Shipping Engine** | Cálculo de envío y tiempos | P1 |
| **Tax Engine** | Cálculo de impuestos y aranceles | P1 |
| **Inventory Engine** | Control de stock virtual | P1 |
| **Notification Service** | Emails, SMS, push | P1 |
| **Admin Panel** | Panel de administración | P2 |
| **Analytics Pipeline** | Métricas y reporting | P2 |
| **Crawler Scheduler** | Programación de crawling | P2 |
| **Image Service** | Procesamiento de imágenes | P2 |
| **Cache Layer** | Redis para caching | P0 |
| **Queue System** | BullMQ para tareas async | P0 |
| **CDN** | Cloudflare para assets estáticos | P0 |
| **Object Storage** | S3-compatible para imágenes | P1 |
| **Monitoring** | Métricas, logs, alertas | P1 |

### Componentes de soporte

| Componente | Descripción | Prioridad |
|------------|-------------|-----------|
| **Auth Service** | Autenticación y autorización | P0 |
| **Rate Limiter** | Protección contra abuso | P1 |
| **Fraud Detection** | Detección de fraude básico | P2 |
| **Audit Logger** | Logs de auditoría | P1 |
| **Secrets Manager** | Gestión de secretos | P0 |
| **Backup System** | Backups automatizados | P1 |
| **Disaster Recovery** | Plan de recuperación | P2 |

### Componentes que el prompt olvida

1. **Currency Service:** Conversión de monedas en tiempo real
2. **Affiliate Manager:** Gestión de programas de afiliados
3. **Content Moderation:** Moderación de contenido de usuarios
4. **Ab Testing Framework:** Para experimentación
5. **Feature Flags:** Para lanzamientos graduales
6. **Email Template Service:** Templates de transaccionales
7. **Webhook Manager:** Para integraciones externas
8. **Health Check System:** Monitoreo de salud de servicios
9. **Circuit Breaker:** Para fallas de proveedores
10. **Retry Logic Manager:** Reintentos inteligentes

---

## 7. DATABASE DESIGN

### Schema conceptual PostgreSQL

```sql
-- Usuarios
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Direcciones
CREATE TABLE addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    street VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(10),
    country VARCHAR(3) DEFAULT 'MX',
    is_default BOOLEAN DEFAULT false
);

-- Marcas
CREATE TABLE brands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Productos (entidad canonical)
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    canonical_name TEXT NOT NULL,
    slug VARCHAR(255) UNIQUE,
    brand_id UUID REFERENCES brands(id),
    category_id UUID,
    gtin VARCHAR(14),
    mpn VARCHAR(100),
    description TEXT,
    attributes JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Variantes de producto
CREATE TABLE product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id),
    sku VARCHAR(100),
    name VARCHAR(255),
    attributes JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Imágenes de producto
CREATE TABLE product_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id),
    variant_id UUID REFERENCES product_variants(id),
    url TEXT NOT NULL,
    alt_text VARCHAR(255),
    position INTEGER DEFAULT 0,
    is_primary BOOLEAN DEFAULT false
);

-- Proveedores
CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE,
    type VARCHAR(50), -- 'api', 'feed', 'scraping', 'direct'
    base_url TEXT,
    api_key_encrypted TEXT,
    config JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    reliability_score DECIMAL(3,2) DEFAULT 0.5,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Productos de proveedores
CREATE TABLE supplier_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID REFERENCES suppliers(id),
    supplier_product_id VARCHAR(255),
    product_id UUID REFERENCES products(id),
    variant_id UUID REFERENCES product_variants(id),
    match_confidence DECIMAL(3,2),
    raw_data JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Precios (event sourcing)
CREATE TABLE price_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_product_id UUID REFERENCES supplier_products(id),
    price DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    shipping_cost DECIMAL(12,2),
    tax_amount DECIMAL(12,2),
    final_price DECIMAL(12,2),
    in_stock BOOLEAN DEFAULT true,
    timestamp TIMESTAMP DEFAULT NOW()
);

-- Precio actual (vista materializada)
CREATE TABLE current_prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_product_id UUID REFERENCES supplier_products(id) UNIQUE,
    price DECIMAL(12,2),
    currency VARCHAR(3) DEFAULT 'USD',
    shipping_cost DECIMAL(12,2),
    tax_amount DECIMAL(12,2),
    final_price DECIMAL(12,2),
    in_stock BOOLEAN DEFAULT true,
    last_updated TIMESTAMP DEFAULT NOW()
);

-- Ofertas (resultado del ranking)
CREATE TABLE offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id),
    variant_id UUID REFERENCES product_variants(id),
    supplier_product_id UUID REFERENCES supplier_products(id),
    our_price DECIMAL(12,2),
    our_margin DECIMAL(12,2),
    margin_percentage DECIMAL(5,2),
    score DECIMAL(3,2),
    is_best_offer BOOLEAN DEFAULT false,
    calculated_at TIMESTAMP DEFAULT NOW()
);

-- Órdenes
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    status VARCHAR(50) DEFAULT 'pending',
    total DECIMAL(12,2),
    currency VARCHAR(3) DEFAULT 'MXN',
    shipping_address_id UUID REFERENCES addresses(id),
    payment_method VARCHAR(50),
    payment_id VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Items de orden
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id),
    product_id UUID REFERENCES products(id),
    variant_id UUID REFERENCES product_variants(id),
    supplier_product_id UUID REFERENCES supplier_products(id),
    quantity INTEGER DEFAULT 1,
    unit_price DECIMAL(12,2),
    total_price DECIMAL(12,2),
    -- Snapshot de precio al momento de compra
    price_snapshot JSONB
);

-- Órdenes a proveedores
CREATE TABLE supplier_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id),
    supplier_id UUID REFERENCES suppliers(id),
    supplier_order_id VARCHAR(255),
    status VARCHAR(50),
    total_cost DECIMAL(12,2),
    tracking_number VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Pagos
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id),
    provider VARCHAR(50),
    provider_payment_id VARCHAR(255),
    amount DECIMAL(12,2),
    currency VARCHAR(3),
    status VARCHAR(50),
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Envíos
CREATE TABLE shipments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id),
    supplier_order_id UUID REFERENCES supplier_orders(id),
    carrier VARCHAR(100),
    service VARCHAR(100),
    tracking_number VARCHAR(255),
    status VARCHAR(50),
    estimated_delivery TIMESTAMP,
    actual_delivery TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Eventos de tracking
CREATE TABLE tracking_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shipment_id UUID REFERENCES shipments(id),
    status VARCHAR(100),
    location VARCHAR(255),
    timestamp TIMESTAMP,
    raw_data JSONB
);

-- Reglas de pricing
CREATE TABLE pricing_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255),
    type VARCHAR(50), -- 'percentage', 'fixed', 'dynamic'
    config JSONB,
    priority INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Snapshots de precio (para auditoría)
CREATE TABLE price_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    offer_id UUID REFERENCES offers(id),
    supplier_price DECIMAL(12,2),
    shipping_cost DECIMAL(12,2),
    tax_amount DECIMAL(12,2),
    total_landed_cost DECIMAL(12,2),
    our_price DECIMAL(12,2),
    margin DECIMAL(12,2),
    timestamp TIMESTAMP DEFAULT NOW()
);

-- Audit log
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(100),
    entity_id UUID,
    action VARCHAR(50),
    user_id UUID,
    changes JSONB,
    ip_address INET,
    timestamp TIMESTAMP DEFAULT NOW()
);
```

### Índices críticos

```sql
-- Productos
CREATE INDEX idx_products_gtin ON products(gtin);
CREATE INDEX idx_products_brand ON products(brand_id);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_attributes ON products USING GIN(attributes);

-- Supplier products
CREATE INDEX idx_supplier_products_supplier ON supplier_products(supplier_id);
CREATE INDEX idx_supplier_products_product ON supplier_products(product_id);
CREATE INDEX idx_supplier_products_match ON supplier_products(match_confidence);

-- Precios
CREATE INDEX idx_current_prices_product ON current_prices(supplier_product_id);
CREATE INDEX idx_price_events_timestamp ON price_events(timestamp);

-- Ofertas
CREATE INDEX idx_offers_product ON offers(product_id);
CREATE INDEX idx_offers_best ON offers(is_best_offer) WHERE is_best_offer = true;

-- Órdenes
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at);

-- Tracking
CREATE INDEX idx_tracking_shipment ON tracking_events(shipment_id);
```

### Estrategia de datos

- **price_events:** Append-only, particionado por mes, TTL de 2 años
- **current_prices:** Actualizado en cada refresh de precio
- **price_snapshots:** Para debugging, TTL de 6 meses
- **audit_logs:** Retención de 1 año, particionado por trimestre
- **supplier_products.raw_data:** JSONB, indexado para búsqueda

---

## 8. PRODUCT INGESTION

### Estrategia de fuentes

#### Tier 1 — Integraciones oficiales (MVP)
| Fuente | Mecanismo | Dificultad | Legalidad |
|--------|-----------|------------|-----------|
| **AliExpress** | API afiliado (Admitad/alternative) | Media | ✅ Permitido |
| **Amazon** | Product Advertising API | Media | ✅ Permitido con ToS |
| **Mercado Libre** | API pública | Baja | ✅ Permitido |

#### Tier 2 — Feeds/Afiliados
| Fuente | Mecanismo | Dificultad | Legalidad |
|--------|-----------|------------|-----------|
| **Google Shopping** | Feed de afiliados | Baja | ✅ Permitido |
| **ShareASale** | API | Baja | ✅ Permitido |
| **CJ Affiliate** | API | Baja | ✅ Permitido |
| **Impact** | API | Baja | ✅ Permitido |

#### Tier 3 — Acuerdos con proveedores
| Fuente | Mecanismo | Dificultad | Legalidad |
|--------|-----------|------------|-----------|
| **Proveedores locales** | API/Webhook/CSV | Media | ✅ Permitido |
| **Distribuidores** | API directa | Alta | ✅ Permitido |

#### Tier 4 — Mecanismos permitidos de crawling
| Fuente | Mecanismo | Dificultad | Legalidad |
|--------|-----------|------------|-----------|
| **Páginas con robots.txt abierto** | HTTP scraping | Media | ⚠️ Revisar ToS |
| **Sitios públicos** | Fetch + parse | Baja | ⚠️ Revisar ToS |

#### Tier 5 — Fuentes experimentales
| Fuente | Mecanismo | Dificultad | Legalidad |
|--------|-----------|------------|-----------|
| **TikTok** | Extracción de URL | Alta | ⚠️ No oficial |
| **Redes sociales** | Scraping público | Alta | ⚠️ Variable |

### Para cada mecanismo

| Mecanismo | Dificultad | Estabilidad | Costo | Escalabilidad | Rate Limits | Mantenimiento | Calidad |
|-----------|------------|-------------|-------|---------------|-------------|---------------|---------|
| API oficial | Media | Alta | Baja-Media | Alta | Limitados | Baja | Alta |
| Feed de afiliados | Baja | Alta | Baja | Alta | Generosos | Baja | Media |
| Scraping | Media | Media | Media | Media | Variables | Alta | Variable |
| CSV manual | Baja | Alta | Gratis | Baja | N/A | Media | Media |
| Webhook | Media | Alta | Baja | Alta | N/A | Baja | Alta |

### Arquitectura de ingestion

```
Source → Adapter → Validator → Normalizer → Matcher → Price Engine → Storage
  │         │          │           │           │           │
  │         │          │           │           │           └─ Event: price.updated
  │         │          │           │           └─ Event: match.found
  │         │          │           └─ Normalize attributes, images, etc.
  │         │          └─ Validate required fields
  │         └─ Source-specific adapter
  └─ Raw data from source
```

---

## 9. PRODUCT MATCHING ENGINE

### Arquitectura híbrida

#### Layer 1: Deterministic Matching (Velocidad)
```python
def deterministic_match(product_a, product_b):
    # GTIN/EAN match → 100% confidence
    if product_a.gtin and product_b.gtin:
        if product_a.gtin == product_b.gtin:
            return MatchResult(type="exact", confidence=1.0)
    
    # MPN + Brand match → 95% confidence
    if product_a.mpn and product_b.mpn:
        if product_a.brand == product_b.brand and product_a.mpn == product_b.mpn:
            return MatchResult(type="exact", confidence=0.95)
    
    # SKU exact match → 90% confidence
    if product_a.sku and product_b.sku:
        if product_a.sku == product_b.sku:
            return MatchResult(type="exact", confidence=0.90)
    
    return None
```

#### Layer 2: Text Matching (Semántico)
```python
def text_match(product_a, product_b):
    # Embedding similarity using sentence-transformers
    embedding_a = encode(product_a.title + " " + product_a.description)
    embedding_b = encode(product_b.title + " " + product_b.description)
    similarity = cosine_similarity(embedding_a, embedding_b)
    
    # BM25 for keyword matching
    bm25_score = bm25_search(product_a.title, [product_b.title])
    
    # Combined score
    text_score = 0.7 * similarity + 0.3 * bm25_score
    
    return text_score
```

#### Layer 3: Image Matching (Visual)
```python
def image_match(product_a, product_b):
    # Perceptual hash (rápido, para pre-filtering)
    hash_a = phash(product_a.images[0])
    hash_b = phash(product_b.images[0])
    hash_similarity = 1 - hamming_distance(hash_a, hash_b) / 64
    
    # CLIP embedding (semántico visual)
    clip_a = clip_encode(product_a.images[0])
    clip_b = clip_encode(product_b.images[0])
    clip_similarity = cosine_similarity(clip_a, clip_b)
    
    return 0.4 * hash_similarity + 0.6 * clip_similarity
```

#### Layer 4: Multimodal Fusion
```python
def multimodal_match(product_a, product_b):
    # Deterministic (si existe, es definitivo)
    det_match = deterministic_match(product_a, product_b)
    if det_match:
        return det_match
    
    # Text similarity
    text_score = text_match(product_a, product_b)
    
    # Image similarity
    image_score = image_match(product_a, product_b)
    
    # Attribute comparison
    attr_score = attribute_similarity(product_a.attributes, product_b.attributes)
    
    # Brand/Model bonus
    brand_bonus = 0.1 if product_a.brand == product_b.brand else 0
    model_bonus = 0.1 if product_a.model == product_b.model else 0
    
    # Category penalty (if different category, reduce confidence)
    category_penalty = -0.2 if product_a.category != product_b.category else 0
    
    # Weighted combination
    final_score = (
        0.35 * text_score +
        0.35 * image_score +
        0.20 * attr_score +
        0.10 * (brand_bonus + model_bonus) +
        category_penalty
    )
    
    # Classification
    if final_score >= 0.95:
        return MatchResult(type="exact", confidence=final_score)
    elif final_score >= 0.85:
        return MatchResult(type="high_confidence", confidence=final_score)
    elif final_score >= 0.70:
        return MatchResult(type="review", confidence=final_score)
    else:
        return MatchResult(type="no_match", confidence=final_score)
```

### Score de confianza (calibración)

**No asumir números fijos.** La calibración debe hacerse con:
1. **Dataset de ground truth:** 1000+ pares de productos conocidos
2. **A/B testing:** Comparar tasas de conversión por nivel de confianza
3. **Feedback loop:** Los usuarios reportan matches incorrectos
4. **Iteración continua:** Ajustar pesos basado en datos reales

**Rangos iniciales (para MVP):**
- 0.95-1.00: Exact match (mostrar como "mismo producto")
- 0.85-0.94: High confidence (mostrar con nota "producto similar")
- 0.70-0.84: Review needed (requiere validación humana o IA)
- <0.70: No match

### Datos necesarios para matching

**Obligatorios:**
- Título
- Marca (si existe)
- Imágenes

**Deseables:**
- GTIN/EAN/UPC
- MPN
- SKU
- Modelo
- Descripción
- Categoría
- Atributos (color, talla, capacidad, etc.)

---

## 10. PRICING ENGINE

### Fórmula de costo final del proveedor

```
Final Supplier Cost =
  Product Cost
  + Shipping Cost (to customer)
  + Import Duties (if applicable)
  + Taxes (IVA)
  + Payment Processing Fee
  + Fulfillment Cost
  + Expected Failure Cost (refund rate * average cost)
  + Currency Conversion Fee (if applicable)
```

### Nuestro precio al cliente

```
Our Customer Price =
  Final Supplier Cost
  + Minimum Viable Margin
  
Subject to:
  - Competitive: ≤ competitor's best price
  - Sustainable: ≥ minimum viable margin (configurable)
  - Transparent: Must represent real final cost
```

### Estrategias de pricing

#### Strategy A: Ser $1 más barato
```
when: competitor_price exists
then: our_price = competitor_price - 1
constraint: our_price >= min_viable_price
```
**Cuándo usar:** Cuando tenemos un competidor claro y queremos ganar por precio.

#### Strategy B: Ser X% más barato
```
when: competitor_price exists
then: our_price = competitor_price * (1 - discount_percentage)
constraint: our_price >= min_viable_price
```
**Cuándo usar:** Para categorías donde el margen es más flexible.

#### Strategy C: Precio mínimo con margen mínimo
```
our_price = final_supplier_cost * (1 + min_margin_percentage)
constraint: min_margin_percentage >= 0.02 (2% mínimo)
```
**Cuándo usar:** Por defecto cuando no hay competidor claro.

#### Strategy D: Precio igual al mejor
```
when: competitor_price < our_calculated_price
then: our_price = competitor_price
constraint: our_price >= final_supplier_cost (no pérdida)
```
**Cuándo usar:** Cuando no podemos mejorar pero no queremos perder la venta.

#### Strategy E: Precio dinámico basado en competencia
```
our_price = dynamic_calculator(
  competitor_prices[],
  our_cost,
  demand_signal,
  stock_level,
  supplier_reliability
)
```
**Cuándo usar:** En fase avanzada con suficientes datos.

#### Strategy F: Margen negativo controlado
```
when: strategic_product == true AND max_loss_per_order <= threshold
then: our_price = final_supplier_cost * (1 - loss_percentage)
```
**Cuándo usar:** Solo para:
- Productos de adquisición (primeras compras de usuario)
- Productos virales (maximizar volumen)
- NUNCA por error del algoritmo

### Árbol de decisión de estrategia

```
¿Tenemos competidor claro?
  ├─ Sí → ¿Nuestro costo es menor?
  │        ├─ Sí → Strategy A ($1 menos) o B (% menos)
  │        └─ No → ¿Podemos igualar sin pérdida?
  │                 ├─ Sí → Strategy D (igualar)
  │                 └─ No → Strategy C (mínimo con margen)
  └─ No → Strategy C (mínimo con margen)
```

---

## 11. BEST OFFER ENGINE

### Definición matemática de "Best Offer"

**No es simplemente `min(price)`.** Es:

```
Best Offer = argmax(offer_score) where:
  offer_score = w1 * price_score + w2 * delivery_score + w3 * reliability_score + w4 * match_confidence + w5 * return_score
```

**Pero con restricción dura:**
```
if any_offer.has_price_difference > 5% from best_price:
  prioritize_price = true
  delivery_weight *= 0.3
```

### Componentes del score

#### Price Score (50% del peso)
```
price_score = 1 - (offer_price - min_price) / min_price
```
- Máxima prioridad: minimizar precio final

#### Delivery Score (20% del peso)
```
delivery_score = 1 - (delivery_days - min_days) / max_acceptable_days
```
- Solo relevante si el precio es competitivo

#### Reliability Score (15% del peso)
```
reliability_score = supplier.reliability_score  # 0-1 basado en historial
```

#### Match Confidence (10% del peso)
```
match_score = product_match.confidence  # Del matching engine
```

#### Return Score (5% del peso)
```
return_score = 1 - supplier.return_rate
```

### Reglas duras (no ponderables)

1. **Confianza mínima de match:** Si match_confidence < 0.70, no ofrecer
2. **Stock:** Si no hay stock, excluir oferta
3. **Proveedor bloqueado:** Si supplier.status == "blocked", excluir
4. **Precio mínimo:** Si our_price < min_viable_price, excluir
5. **Región:** Si no envía a la dirección del cliente, excluir

### Ranking final

```python
def rank_offers(offers, customer_address):
    filtered = apply_hard_rules(offers, customer_address)
    
    for offer in filtered:
        offer.price_score = calculate_price_score(offer)
        offer.delivery_score = calculate_delivery_score(offer, customer_address)
        offer.reliability_score = offer.supplier.reliability_score
        offer.match_score = offer.product_match.confidence
        offer.return_score = 1 - offer.supplier.return_rate
        
        offer.total_score = (
            0.50 * offer.price_score +
            0.20 * offer.delivery_score +
            0.15 * offer.reliability_score +
            0.10 * offer.match_score +
            0.05 * offer.return_score
        )
    
    ranked = sorted(filtered, key=lambda x: x.total_score, reverse=True)
    
    # Ensure best price wins unless difference is minimal
    if len(ranked) > 1:
        price_diff = ranked[1].final_price - ranked[0].final_price
        if price_diff > ranked[0].final_price * 0.03:  # >3% difference
            # Price wins, re-rank by price
            ranked = sorted(filtered, key=lambda x: x.final_price)
    
    return ranked
```

---

## 12. CHECKOUT

### Arquitectura de checkout

```
Cart → Address → Shipping Options → Tax Calculation → Payment → Confirmation → Order Created → Supplier Purchase
```

### Guest checkout vs. Cuenta

**MVP:** Guest checkout obligatorio + opción de crear cuenta
**Versión 2:** Checkout con cuenta opcional

**Por qué guest primero:**
- Reduce fricción
- Más rápido de implementar
- No necesitamos verificar email
- Los usuarios de TikTok quieren comprar rápido

### Flujo de checkout

```typescript
interface CheckoutRequest {
  items: CheckoutItem[];
  shipping_address: Address;
  payment_method: PaymentMethod;
  email: string;
  phone?: string;
  create_account?: boolean;
}

interface CheckoutItem {
  product_id: string;
  variant_id: string;
  supplier_product_id: string;
  quantity: number;
  // Snapshot de precio al momento de agregar al carrito
  price_snapshot: {
    our_price: number;
    supplier_price: number;
    shipping_cost: number;
    tax_amount: number;
    timestamp: string;
  };
}
```

### Validaciones de checkout

1. **Stock verification:** Reconfirmar stock con proveedor
2. **Price verification:** Reconfirmar precio (tolerancia de ±2%)
3. **Address validation:** Validar dirección con API de envío
4. **Payment validation:** Validar método de pago
5. **Rate limiting:** Prevenir abuso de checkout

### Idempotency

Cada checkout debe ser idempotente:
```typescript
// Client genera un checkout_token único
const checkout_token = generateUUID();

// Si el mismo token se envía dos veces, retorna la misma orden
// Evita doble cobro
```

### Payment authorization flow

```
1. Client envía checkout
2. Server crea order (status: "pending_payment")
3. Server autoriza pago (no captura aún)
4. Server compra al proveedor
5. Si proveedor confirma → capturar pago → status: "confirmed"
6. Si proveedor falla → cancelar autorización → status: "failed"
```

### Proveedores de pago para México

| Proveedor | Cuota | Ventajas | Desventajas |
|-----------|-------|----------|-------------|
| **Conekta** | 2.9% + $2.50 MXN | Hecho en México, SPEI, OXXO | Menos features internacionales |
| **Stripe** | 3.6% + $3 MXN | Global, excellent API | Más caro en México |
| **Mercado Pago** | 3.49% + $0 MXN | Popular en LATAM | Menos control |
| **OpenPay** | 2.9% + $2.50 MXN | Buena integración | Menos popular |

**Recomendación MVP:** Conekta (mejor relación costo/calidad para México)
**Alternativa:** Stripe si planeamos expansión LATAM rápida

---

## 13. ORDER ROUTING

### Flujo post-pago

```
Order Confirmed
  ↓
Supplier Selection Algorithm
  ↓
Purchase Request
  ↓
Supplier Confirmation (timeout: 30s-5min)
  ↓
  ├─ Confirmed → Update order status → Begin fulfillment
  └─ Failed → Try next supplier (fallback)
```

### Algoritmo de selección de proveedor

```python
def select_supplier(order_item, available_suppliers):
    scored_suppliers = []
    
    for supplier in available_suppliers:
        score = calculate_supplier_score(
            supplier,
            order_item.product,
            order_item.quantity,
            order_item.destination
        )
        scored_suppliers.append((supplier, score))
    
    # Sort by score descending
    scored_suppliers.sort(key=lambda x: x[1], reverse=True)
    
    # Try in order
    for supplier, score in scored_suppliers:
        try:
            result = attempt_purchase(supplier, order_item)
            if result.success:
                return supplier, result
        except SupplierError:
            continue
    
    # All suppliers failed
    raise AllSuppliersFailedError()
```

### Score de proveedor

```python
def calculate_supplier_score(supplier, product, quantity, destination):
    # Price (50%)
    price = get_supplier_price(supplier, product, quantity, destination)
    price_score = 1 / (1 + price)  # Normalized
    
    # Stock availability (20%)
    stock = check_stock(supplier, product)
    stock_score = 1.0 if stock > quantity else stock / quantity
    
    # Reliability (15%)
    reliability_score = supplier.success_rate  # Historical
    
    # Delivery time (10%)
    delivery_days = estimate_delivery(supplier, destination)
    delivery_score = 1 / (1 + delivery_days)
    
    # Return rate (5%)
    return_score = 1 - supplier.return_rate
    
    return (
        0.50 * price_score +
        0.20 * stock_score +
        0.15 * reliability_score +
        0.10 * delivery_score +
        0.05 * return_score
    )
```

### Fallback strategy

```python
FALLBACK_CHAIN = [
    PrimarySupplier,
    SecondarySupplier,
    TertiarySupplier,
]

# Si el primario falla, intentar secundario
# Si todos fallan:
#   1. Notificar al equipo
#   2. Ofrecer al cliente: reembolso o espera
#   3. Logging para análisis
```

### Timeout y cancelación

- **Timeout de compra:** 5 minutos
- **Si timeout:** Intentar siguiente proveedor
- **Si todos fallan:** Cancelar orden, reembolsar automáticamente
- **Retry policy:** No retry automático (el cliente debe reintentar)

---

## 14. FULFILLMENT

### Modelo: Dropshipping puro (MVP)

**No mantenemos inventario.** El proveedor cumple directamente.

### Flujo

```
Order Confirmed → Supplier Purchase → Supplier Ships → Tracking Updated → Customer Receives
```

### Tracking aggregation

Cada proveedor tiene su propio sistema de tracking. Nosotros:
1. Recibemos número de tracking del proveedor
2. Consultamos API del carrier (si disponible)
3. Normalizamos eventos de tracking
4. Mostramos al cliente en nuestro formato

### State machine de orden

```
pending_payment → pending_supplier → supplier_confirmed → processing → shipped → delivered → completed
                   ↓                       ↓
                   ↓                    supplier_failed
                   ↓                       ↓
                payment_failed          cancelled → refunded
```

---

## 15. INFRASTRUCTURE

### Análisis de opciones

#### VPS Tradicionales

| Proveedor | CPU | RAM | Storage | Bandwidth | Precio/mes | Ventajas |
|-----------|-----|-----|---------|-----------|------------|----------|
| **Hetzner** | 2 vCPU | 4GB | 40GB SSD | 20TB | ~$5 | Excelente precio/calidad |
| **OVH** | 2 vCPU | 4GB | 50GB SSD | Sin límite | ~$7 | Bandwidth ilimitado |
| **DigitalOcean** | 2 vCPU | 4GB | 80GB SSD | 5TB | ~$24 | Buena DX |
| **Vultr** | 2 vCPU | 4GB | 50GB SSD | 5TB | ~$24 | Global |

#### Cloud

| Proveedor | Servicio | Precio | Ventajas |
|-----------|----------|--------|----------|
| **AWS** | EC2 t3.medium | ~$30/mes | Escalabilidad, servicios managed |
| **GCP** | e2-medium | ~$25/mes | ML integrado |
| **Cloudflare** | Workers | $5/mes | Edge computing |

### Recomendación MVP

**Frontend:** Vercel (gratis para hobby, $20/mes para pro)
**Backend:** Hetzner VPS (€5-10/mes)
**Database:** Hetzner VPS (mismo o separado)
**Cache:** Redis en Hetzner
**Storage:** Cloudflare R2 ($0.015/GB)
**CDN:** Cloudflare (gratis)
**Email:** Resend ($20/mes)
**Monitoring:** Sentry (gratis tier) + Grafana Cloud (gratis)

**Costo total MVP:** ~$50-100/mes

### Evolución por escala

| Usuarios | Infraestructura | Costo/mes |
|----------|-----------------|-----------|
| MVP | Hetzner + Vercel + Cloudflare | $50-100 |
| 10k | Hetzner (upgrade) + Vercel Pro | $150-300 |
| 100k | AWS/GCP (managed services) | $1,000-2,000 |
| 1M | AWS/GCP multi-region | $5,000-15,000 |
| 10M | Multi-cloud, CDN global | $20,000-50,000 |

---

## 16. VPS / SERVERS

### Topología inicial (MVP)

```
                    Cloudflare (CDN + DNS)
                           │
                    ┌──────▼──────┐
                    │   Vercel    │
                    │  (Frontend) │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │   Hetzner   │
                    │   VPS #1    │
                    │  (Backend)  │
                    │  4 vCPU     │
                    │  8GB RAM    │
                    │  80GB SSD   │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
        ┌─────▼─────┐ ┌───▼───┐ ┌─────▼─────┐
        │ PostgreSQL │ │ Redis │ │ BullMQ    │
        │   (DB #1)  │ │(Cache)│ │ (Workers) │
        └───────────┘ └───────┘ └───────────┘
```

### MVP (1-2 servidores)

| Servidor | CPU | RAM | Storage | Propósito |
|----------|-----|-----|---------|-----------|
| **App Server** | 4 vCPU | 8GB | 80GB SSD | Backend + Workers + Redis |
| **DB Server** | 2 vCPU | 4GB | 160GB SSD | PostgreSQL |

**Costo:** ~$20-30/mes en Hetzner

### Producción temprana (10k usuarios)

| Servidor | CPU | RAM | Storage | Propósito |
|----------|-----|-----|---------|-----------|
| **App #1** | 4 vCPU | 8GB | 80GB SSD | API + Web |
| **App #2** | 4 vCPU | 8GB | 80GB SSD | Workers |
| **DB Primary** | 4 vCPU | 16GB | 320GB SSD | PostgreSQL primary |
| **DB Replica** | 2 vCPU | 8GB | 160GB SSD | PostgreSQL read replica |
| **Redis** | 2 vCPU | 4GB | 40GB SSD | Cache + Queue |

**Costo:** ~$100-150/mes

### 100k usuarios

| Servidor | CPU | RAM | Storage | Propósito |
|----------|-----|-----|---------|-----------|
| **Load Balancer** | 2 vCPU | 4GB | - | Nginx/HAProxy |
| **App (2-4)** | 4 vCPU | 8GB | 80GB SSD | Backend horizontal |
| **Workers (2)** | 4 vCPU | 16GB | 80GB SSD | Crawler + Pricing |
| **DB Primary** | 8 vCPU | 32GB | 640GB SSD | PostgreSQL |
| **DB Replica (2)** | 4 vCPU | 16GB | 320GB SSD | Read replicas |
| **Redis Cluster** | 4 vCPU | 8GB | 80GB SSD | Cache + Queue |
| **Search** | 4 vCPU | 8GB | 160GB SSD | Meilisearch |

**Costo:** ~$500-1,000/mes

### 1M usuarios

Migrar a AWS/GCP con:
- ECS/EKS para containers
- RDS para PostgreSQL
- ElastiCache para Redis
- OpenSearch para búsqueda
- S3 para storage
- CloudFront para CDN

**Costo:** ~$3,000-8,000/mes

---

## 17. SCRAPING / CRAWLING

### Arquitectura (solo fuentes permitidas)

```
Scheduler (BullMQ)
  ↓
URL Queue
  ↓
Worker Pool (concurrency limit per domain)
  ↓
HTTP Client (con rate limiting)
  ↓
Parser (versioned per domain)
  ↓
Data Validator
  ↓
Normalization Pipeline
  ↓
Storage
```

### Políticas por dominio

```typescript
const domainPolicies = {
  "aliexpress.com": {
    allowed: true,
    rateLimit: "10 requests/minute",
    robotsTxt: "check",
    tos: "review required",
    method: "official_api_preferred"
  },
  "amazon.com.mx": {
    allowed: true,
    rateLimit: "1 request/second",
    robotsTxt: "check",
    tos: "paapi_only",
    method: "official_api"
  },
  "mercadolibre.com.mx": {
    allowed: true,
    rateLimit: "unlimited_with_api_key",
    robotsTxt: "check",
    tos: "api_allowed",
    method: "official_api"
  }
};
```

### Rate limiting

```python
class RateLimiter:
    def __init__(self):
        self.redis = Redis()
    
    async def acquire(self, domain: str) -> bool:
        key = f"rate_limit:{domain}"
        current = await self.redis.incr(key)
        if current == 1:
            await self.redis.expire(key, 60)  # 1 minute window
        
        limit = get_domain_limit(domain)
        return current <= limit
```

### Proxy strategy

**NO usar proxies para evadir restricciones.** Solo usar proxies si:
- El sitio lo permite explícitamente
- Tenemos acuerdo comercial
- Es necesario para geolocalización (precios regionales)

### Change detection

```python
async def detect_changes(supplier_product_id: str, new_data: dict):
    current = await db.get(supplier_product_id)
    
    changes = {
        "price_changed": current.price != new_data.price,
        "stock_changed": current.in_stock != new_data.in_stock,
        "description_changed": current.description != new_data.description
    }
    
    if any(changes.values()):
        await emit_event("product.changed", {
            "supplier_product_id": supplier_product_id,
            "changes": changes,
            "old": current,
            "new": new_data
        })
```

---

## 18. SEARCH

### Búsqueda por tipo

| Tipo | Implementación MVP | Evolución |
|------|-------------------|-----------|
| **Texto** | PostgreSQL full-text | Meilisearch |
| **URL** | Redirect/parse | Direct matching |
| **Imagen** | No MVP | CLIP + vector DB |
| **SKU** | PostgreSQL exact match | Meilisearch |
| **Marca** | PostgreSQL filter | Meilisearch facet |
| **Categoría** | PostgreSQL filter | Meilisearch facet |

### Recomendación

**MVP:** PostgreSQL full-text search
- Funciona bien hasta 100k productos
- Sin infraestructura adicional
- Full-text search + trigram similarity

**100k+ productos:** Meilisearch
- Más rápido que PostgreSQL para búsquedas complejas
- Facetas integradas
- Typo tolerance
- Self-hosted (Hetzner)

**1M+ productos:** Meilisearch cluster o Elasticsearch

### Schema Meilisearch

```json
{
  "uid": "products",
  "primaryKey": "id",
  "fields": [
    "title",
    "description",
    "brand",
    "category",
    "sku",
    "price",
    "rating"
  ],
  "filterableAttributes": [
    "brand",
    "category",
    "price_range",
    "in_stock"
  ],
  "sortableAttributes": [
    "price",
    "rating",
    "created_at"
  ]
}
```

---

## 19. AI / ML

### Dónde AI aporta valor

| Caso | Solución | MVP | Evolución |
|------|----------|-----|-----------|
| **Extracción de atributos** | LLM (GPT-4) | ✅ | Fine-tuned model |
| **Clasificación de categoría** | Embeddings + classifier | ✅ | Custom model |
| **Product matching** | Multimodal embeddings | ✅ | Custom model |
| **Image understanding** | CLIP / GPT-4V | ✅ | Custom model |
| **OCR** | Tesseract / cloud OCR | ✅ | Custom model |
| **Normalización de texto** | Reglas + LLM fallback | ✅ | Custom model |
| **Detección de fraude** | Reglas + ML | ❌ | Phase 3 |

### Dónde NO usar AI

| Caso | Mejor solución |
|------|----------------|
| **Cálculo de precio** | Reglas determinísticas |
| **Cálculo de impuestos** | Tablas + reglas |
| **Cálculo de envío** | APIs de carriers |
| **Checkout flow** | Lógica determinística |
| **Order routing** | Reglas + scoring |

### Arquitectura híbrida

```
Rules Engine (deterministic)
  ↓ (if confidence < threshold)
ML Model (classical)
  ↓ (if confidence < threshold)
Embeddings (semantic)
  ↓ (if confidence < threshold)
LLM (expensive, last resort)
```

### Costo de AI

| Servicio | Uso | Costo estimado |
|----------|-----|----------------|
| **OpenAI GPT-4** | Extracción de atributos | ~$0.01-0.03/producto |
| **OpenAI CLIP** | Image matching | ~$0.001/imagen |
| **OpenAI embeddings** | Text similarity | ~$0.0001/texto |

**Costo total estimado MVP:** ~$50-200/mes

---

## 20. SECURITY

### Checklist de seguridad

#### Secrets Management
- [ ] Usar Vault o SOPS para secrets
- [ ] Nunca hardcodear API keys
- [ ] Rotación automática de secrets
- [ ] Secrets por ambiente (dev/staging/prod)

#### Payment Security
- [ ] No almacenar datos de tarjetas (usar tokenización)
- [ ] PCI DSS compliance a través del payment provider
- [ ] Validación de webhooks con firmas
- [ ] Idempotency en transacciones

#### API Security
- [ ] Rate limiting por IP y por usuario
- [ ] JWT con expiración corta
- [ ] CORS configurado correctamente
- [ ] Input validation en todos los endpoints
- [ ] SQL injection prevention (ORM parameterized queries)
- [ ] XSS prevention (sanitize output)

#### Data Security
- [ ] Encryption at rest (AES-256)
- [ ] Encryption in transit (TLS 1.3)
- [ ] PII encryption (email, phone)
- [ ] Data retention policies
- [ ] Right to deletion (GDPR-like)

#### Infrastructure Security
- [ ] SSH key-only authentication
- [ ] Firewall configurado
- [ ] Fail2ban activo
- [ ] Regular security updates
- [ ] Backup encryption

#### Application Security
- [ ] Dependency scanning (npm audit, Snyk)
- [ ] Container scanning (si usamos Docker)
- [ ] SAST (static analysis)
- [ ] CSRF protection
- [ ] Content Security Policy headers

### Autenticación

**MVP:** JWT + refresh tokens
**Versión 2:** OAuth2 + possible SSO

```typescript
// Token structure
interface AccessToken {
  sub: string;        // user_id
  email: string;
  role: 'user' | 'admin';
  iat: number;
  exp: number;        // 15 minutes
}

interface RefreshToken {
  sub: string;
  iat: number;
  exp: number;        // 7 days
  family: string;     // Token family for rotation
}
```

---

## 21. OBSERVABILITY

### Three pillars

#### Logs
- **Framework:** Pino (structured JSON logging)
- **Transport:** stdout → file → aggregation service
- **Levels:** error, warn, info, debug
- **Context:** request_id, user_id, timestamp

#### Metrics
- **Framework:** Prometheus + Grafana
- **Types:** Counter, Gauge, Histogram
- **Scrape interval:** 15 seconds

#### Traces
- **Framework:** OpenTelemetry
- **Sampling:** 1% in production, 100% in development

### Métricas de negocio

| Métrica | Tipo | Descripción |
|---------|------|-------------|
| `searches_per_day` | Counter | Búsquedas diarias |
| `products_identified` | Counter | Productos identificados |
| `matches_found` | Counter | Matches encontrados |
| `conversion_rate` | Gauge | Tasa de conversión |
| `average_savings` | Histogram | Ahorro promedio |
| `best_offer_rate` | Gauge | % de veces que somos la mejor oferta |
| `average_margin` | Gauge | Margen promedio |
| `zero_margin_orders` | Counter | Órdenes con margen 0 |
| `negative_margin_orders` | Counter | Órdenes con margen negativo |
| `order_success_rate` | Gauge | % de órdenes completadas |
| `supplier_failure_rate` | Gauge | % de fallos por proveedor |
| `refund_rate` | Gauge | % de reembolsos |

### Métricas técnicas

| Métrica | Tipo | Alerta si |
|---------|------|-----------|
| `api_latency_p99` | Histogram | > 500ms |
| `queue_latency` | Histogram | > 10s |
| `db_latency_p99` | Histogram | > 100ms |
| `crawler_success_rate` | Gauge | < 90% |
| `stale_prices` | Gauge | > 10% |
| `matching_confidence_avg` | Gauge | < 0.8 |
| `cache_hit_rate` | Gauge | < 80% |

### Alertas críticas

```yaml
alerts:
  - name: high_error_rate
    condition: rate(http_requests_total{status="5xx"}[5m]) > 0.05
    severity: critical
    action: page on-call
    
  - name: price_staleness
    condition: stale_prices > 0.2
    severity: warning
    action: notify slack
    
  - name: supplier_down
    condition: supplier_success_rate < 0.5 for 10m
    severity: warning
    action: notify slack + email
    
  - name: payment_failure
    condition: payment_failure_rate > 0.1
    severity: critical
    action: page on-call
```

---

## 22. ADMIN PANEL

### Funcionalidades

#### Dashboard
- Métricas en tiempo real (ventas, órdenes, margen)
- Alertas activas
- Supplier health status

#### Gestión de productos
- Ver productos y variantes
- Ver matches por producto
- Revisar/market manual de matches
- Bloquear productos específicos

#### Gestión de proveedores
- Ver lista de proveedores
- Ver métricas de cada proveedor
- Activar/desactivar proveedores
- Configurar rate limits

#### Gestión de precios
- Ver historial de precios
- Configurar reglas de pricing
- Override manual de precios
- Ver márgenes por categoría

#### Gestión de órdenes
- Ver todas las órdenes
- Filtrar por estado
- Ver detalles de orden
- Procesar reembolsos manualmente
- Reintentar órdenes fallidas

#### Gestión de usuarios
- Ver usuarios
- Ver historial de compras
- Ban usuarios abusivos

### Stack para admin

**MVP:** Next.js admin (parte de la misma app)
**Versión 2:** Considerar Retool o admin custom

---

## 23. DATA / ANALYTICS

### Data pipeline

```
Events → Kafka/BullMQ → Transform → Store → Analyze → Visualize
```

### Métricas a trackear

#### Comportamiento de usuario
- Qué productos buscan
- Qué productos compran
- Desde dónde llegan (TikTok, direct, etc.)
- Tasa de conversión por fuente
- Abandono de carrito

#### Performance del sistema
- Dónde encontramos mejores precios
- Qué proveedores son mejores
- Qué categorías tienen mayor margen
- Qué productos generan pérdida
- Dónde fallan los matches
- Dónde fallan proveedores

#### Feedback loop

```
Data collected → Insights → Algorithm improvements → Better prices → More conversions → More data
```

### Herramientas

| Herramienta | Uso | Costo |
|-------------|-----|-------|
| **PostgreSQL** | Almacenamiento principal | $0 (self-hosted) |
| **Grafana** | Dashboards | $0 (Cloud free tier) |
| **Prometheus** | Métricas | $0 (self-hosted) |
| **Sentry** | Error tracking | $0 (free tier) |
| **Resend** | Email analytics | $20/mes |

---

## 24. EXPERIMENTATION

### A/B Testing framework

```typescript
interface Experiment {
  id: string;
  name: string;
  variants: Variant[];
  traffic_split: number[];  // e.g., [50, 50]
  start_date: Date;
  end_date: Date;
  metrics: string[];
  guardrails: string[];  // Metrics that must not degrade
}

interface Variant {
  id: string;
  name: string;
  config: Record<string, any>;
}
```

### Qué experimentar

| Área | Ejemplo | Métrica |
|------|---------|---------|
| **Precio** | $102 vs $99.99 | Conversion rate |
| **UI** | Botón verde vs azul | Click rate |
| **Savings messaging** | "Ahorra $6" vs "12% menos" | Conversion rate |
| **Checkout** | 3 pasos vs 1 paso | Completion rate |
| **Shipping** | "Envío gratis" vs "$4.99" | Conversion rate |

### Guardrails (nunca violar)

1. **No engañar sobre precio:** El precio mostrado debe ser el real
2. **No margen negativo accidental:** Alerta si margen < 0 sin explícito flag
3. **No degradar UX:** Si métrica de UX cae >5%, detener experimento
4. **No sacrificar confiabilidad:** Si tasa de error sube >1%, detener

---

## 25. BUSINESS MODEL

### Modelos compatibles con nuestra filosofía

| Modelo | Descripción | Compatibilidad |
|--------|-------------|----------------|
| **1. Margen por transacción** | X% por cada venta | ✅ Compatibe si es bajo |
| **2. Afiliación** | Comisión de proveedores | ✅ Ideal (no afecta precio) |
| **3. Supplier commission** | Proveedor nos pone comisión | ✅ Compatible |
| **4. Direct supplier deals** | Acuerdos directos | ✅ Ideal (mejores precios) |
| **5. Advertising** | Productos patrocinados | ⚠️ Con restricciones |
| **6. Premium membership** | Features extra | ⚠️ No bloquear features básicas |
| **7. Sponsored products** | Productos destacados | ⚠️ Solo si son realmente ofertas |

### Modelo recomendado (fase inicial)

**Primario:** Margen por transacción (3-5%)
**Secundario:** Programas de afiliados (comisión de proveedores)
**Terciario:** (Futuro) Acuerdos directos con proveedores

### Por qué este modelo

1. **Margen bajo pero escalable:** 3% de $100 = $3. A 1000 órdenes = $3,000
2. **Afiliados son gratis:** El proveedor paga comisión, no el usuario
3. **Escalable:** Más volumen = más margen total
4. **Competitivo:** Podemos ofrecer los mejores precios

### Ingresos proyectados (ejemplo)

| Usuarios | Órdenes/mes | Ticket promedio | Ingreso mensual |
|----------|-------------|-----------------|-----------------|
| MVP | 100 | $500 MXN | $1,500 MXN |
| 10k | 1,000 | $500 MXN | $15,000 MXN |
| 100k | 10,000 | $500 MXN | $150,000 MXN |
| 1M | 100,000 | $500 MXN | $1,500,000 MXN |

*(Asumiendo 3% de margen promedio)*

---

## 26. LEGAL / COMPLIANCE

### Preguntas que DEBEN validarse con abogados/contadores

#### Ecommerce
1. **¿Necesitamos constituir empresa en México?** Sí, para facturar
2. **¿Qué tipo de sociedad?** (SA de CV, SRL, etc.)
3. **¿Necesitamos registro ante PROFECO?** Probablemente sí

#### Consumidor
4. **¿Cuáles son nuestras obligaciones como vendedor?** Ley Federal de Protección al Consumidor
5. **¿Debemos ofrecer garantía?** Sí, mínimo 90 días por ley
6. **¿Política de devoluciones?** Mínimo 5 días hábiles

#### Facturación
7. **¿Necesitamos emitir CFDI?** Sí, obligatorio
8. **¿Necesitamos contabilidad electrónica?** Sí
9. **¿Retenciones de IVA?** Depende del régimen fiscal

#### Importaciones
10. **¿Necesitamos pedimento de importación?** Depende del valor y frecuencia
11. **¿Quién paga aranceles?** Definir si DDP o DDU
12. **¿IVA en importaciones?** 16% generalmente

#### Uso de datos de otros sitios
13. **¿Podemos usar imágenes de TikTok?** Revisar ToS de TikTok
14. **¿Podemos usar datos de Amazon?** Solo vía API oficial
15. **¿Scraping permitido?** Depende del sitio

#### Scraping
16. **¿Es legal el scraping en México?** No hay ley explícita, pero hay riesgos
17. **¿Robots.txt es legally binding?** No en México, pero es buena práctica
18. **¿Qué dice cada ToS?** Revisar caso por caso

#### Pagos
19. **¿Necesitamos licencia para manejar pagos?** No si usamos provider externo
20. **¿Ley Fintech aplica?** No si no retenemos fondos

#### Publicidad
21. **¿Podemos decir "el más barato"?** Solo si podemos probarlo
22. **¿Precios comparativos?** Revisar regulaciones de PROFECO
23. **¿Publicidad engañosa?** Revisar con abogado

---

## 27. MÉTRICA PRINCIPAL (NORTH STAR)

### Propuesta: Customer Savings Score

```
Customer Savings Score = 
  (Reference Price - Our Price) / Reference Price * 100
```

Donde:
- **Reference Price:** El precio más bajo verificable que encontramos en otras fuentes
- **Our Price:** Nuestro precio al usuario

### Métricas de soporte

| Métrica | Descripción | Target |
|---------|-------------|--------|
| **Best Offer Rate** | % de productos donde somos los más baratos | > 70% |
| **Average Savings** | Ahorro promedio vs referencia | > 5% |
| **Price Advantage** | Diferencia porcentual vs mejor alternativa | < -2% |
| **Match Accuracy** | % de matches correctos | > 95% |
| **Fulfillment Success** | % de órdenes completadas | > 98% |
| **Contribution Margin** | Margen después de costos | > 2% |

### Combinación correcta

**North Star:** Customer Savings Score (ponderado)
```
NSS = 0.4 * BestOfferRate + 0.3 * AverageSavings + 0.2 * MatchAccuracy + 0.1 * FulfillmentSuccess
```

**Razón:** Priorizamos que el usuario ahorre (BestOfferRate + AverageSavings), que el matching sea correcto (MatchAccuracy), y que la orden se cumpla (FulfillmentSuccess).

---

## 28. FAILURE MODES

### Análisis de fallos

| Fallo | Detección | Prevención | Fallback | Recuperación |
|-------|-----------|------------|----------|--------------|
| **Precio desactualizado** | Verify price before checkout | Cache TTL corto (5-15 min) | Reject if >5% change | Re-crawl |
| **Proveedor sin stock** | Stock check before purchase | Verify stock at checkout | Try next supplier | Notify user |
| **Producto diferente** | Match confidence check | Strict matching rules | Don't offer if low confidence | Manual review |
| **Shipping inesperado** | Calculate at checkout | Real-time shipping API | Show estimated range | Refund if >20% diff |
| **Impuesto inesperado** | Tax calculation at checkout | Tax database | Conservative estimate | Absorb difference |
| **Proveedor cancela** | Supplier confirmation timeout | Require confirmation | Auto-refund + notify | Escalate |
| **Precio cambia** | Pre-purchase verification | Idempotent pricing | Honor price if <5% diff | Absorb o refund |
| **Marketplace bloquea API** | API error monitoring | Respect rate limits | Cached data | Alert team |
| **Proveedor desaparece** | Health monitoring | Multiple suppliers | Remove from ranking | Find alternative |
| **Fraude** | Anomaly detection | Velocity checks | Block + review | Manual approval |
| **Chargeback** | Payment provider alerts | Clear policies | Absorb cost | Fight if valid |
| **Devolución** | Return tracking | Quality checks | Process return | Restock o write off |
| **Producto defectuoso** | Customer report | Supplier vetting | Return + refund | Rate supplier down |
| **Usuario abusa** | Pattern detection | Rate limiting | Block + review | Ban account |
| **Discrepancia moneda** | Exchange rate API | Lock rate at checkout | Honor rate for 15 min | Absorb difference |
| **Error de conversión** | Validation checks | Unit testing | Alert + fix | Manual correction |
| **Error de variante** | Attribute validation | Strict validation | Cancel + refund | Fix matching |
| **Proveedor tarda** | SLA monitoring | Set expectations | Update ETA | Compensate |
| **API caída** | Health checks | Circuit breaker | Serve cached data | Alert + recover |

### Plan de contingencia

**Si un proveedor principal falla:**
1. Detectar en < 5 minutos
2. Activar fallback automático
3. Notificar equipo
4. Analizar causa raíz
5. Implementar fix

**Si hay fraude sistémico:**
1. Detectar patrones anómalos
2. Bloquear transacciones sospechosas
3. Notificar equipo inmediatamente
4. Investigar
5. Implementar contramedidas

---

## 29. COSTOS

### Costos por fase

#### MVP (1-100 usuarios)

| Componente | Costo mensual |
|------------|---------------|
| Hetzner VPS (App + DB) | $20 |
| Vercel (Frontend) | $0 |
| Cloudflare (CDN + DNS) | $0 |
| Resend (Email) | $0 |
| Sentry (Error tracking) | $0 |
| OpenAI API (AI) | $50 |
| Dominio | $1 |
| **Total** | **~$71/mes** |

#### 10k usuarios

| Componente | Costo mensual |
|------------|---------------|
| Hetzner VPS (App) | $20 |
| Hetzner VPS (DB) | $15 |
| Vercel Pro | $20 |
| Cloudflare Pro | $20 |
| Resend | $20 |
| Sentry | $0 |
| OpenAI API | $200 |
| Monitoring (Grafana Cloud) | $0 |
| **Total** | **~$295/mes** |

#### 100k usuarios

| Componente | Costo mensual |
|------------|---------------|
| AWS/GCP (App servers) | $200 |
| AWS/GCP (Database) | $300 |
| AWS/GCP (Cache) | $100 |
| AWS/GCP (Storage) | $50 |
| Cloudflare | $200 |
| Resend | $50 |
| Sentry | $26 |
| OpenAI API | $1,000 |
| Monitoring | $100 |
| **Total** | **~$2,026/mes** |

#### 1M usuarios

| Componente | Costo mensual |
|------------|---------------|
| AWS/GCP (Compute) | $2,000 |
| AWS/GCP (Database) | $1,500 |
| AWS/GCP (Cache) | $500 |
| AWS/GCP (Storage) | $200 |
| AWS/GCP (CDN) | $500 |
| Cloudflare | $500 |
| Resend | $200 |
| Sentry | $80 |
| OpenAI API | $5,000 |
| Monitoring | $300 |
| **Total** | **~$10,780/mes** |

### Costos fijos vs variables

| Tipo | Ejemplos |
|------|----------|
| **Fijos** | VPS, dominio, email, monitoring |
| **Variables** | AI API, bandwidth, storage, payments |

---

## 30. STACK TECNOLÓGICO

### Stack completo seleccionado

| Capa | Tecnología | Justificación |
|------|------------|---------------|
| **Frontend** | Next.js 14 (App Router) | SSR/SSG, React ecosystem, Vercel deployment |
| **UI Components** | shadcn/ui + Tailwind | Componentes modernos, accesibles, customizables |
| **Backend** | TypeScript + Node.js (Fastify) | Type safety, performance, mismo lenguaje que frontend |
| **Database** | PostgreSQL 16 | Robusto, JSONB para atributos, full-text search |
| **Cache** | Redis 7 | Queues, cache, sessions |
| **Queue** | BullMQ | Redis-based, reliable, good DX |
| **Search** | PostgreSQL → Meilisearch | Empezar simple, migrar cuando sea necesario |
| **AI** | OpenAI API + sentence-transformers | GPT-4 para extracción, embeddings para matching |
| **Storage** | Cloudflare R2 | S3-compatible, cheap, no egress fees |
| **CDN** | Cloudflare | Gratis, rápido, DDoS protection |
| **Email** | Resend | Moderno, good DX, React Email |
| **Monitoring** | Sentry + Grafana + Prometheus | Error tracking + metrics + dashboards |
| **Auth** | NextAuth.js | Integrado con Next.js, múltiples providers |
| **Payments** | Conekta | Hecho para México, SPEI, OXXO, tarjetas |
| **Testing** | Vitest + Playwright | Unit + E2E testing |
| **CI/CD** | GitHub Actions | Integrado con GitHub |
| **Docker** | Docker + Docker Compose | Local development + deployment |
| **Migrations** | Drizzle ORM | Type-safe, lightweight |

### Por qué este stack

1. **TypeScript everywhere:** Un solo lenguaje, type safety end-to-end
2. **PostgreSQL:** No necesitamos NoSQL para esto, JSONB cubre atributos variables
3. **Redis + BullMQ:** Simple, confiable,Redis + BullMQ:** Simple, confiable,无需 Kafka para MVP
4. **Next.js:** Deploy gratis en Vercel, SSR para SEO
5. **Conekta:** Optimizado para México, mejor que Stripe en México
6. **Cloudflare:** Gratis y mejor que AWS CloudFront para empezar

---

## 31. DEVELOPMENT ENVIRONMENT

### Configuración

```
project/
├── apps/
│   ├── web/              # Next.js frontend
│   └── admin/            # Next.js admin panel
├── packages/
│   ├── db/               # Drizzle schema + migrations
│   ├── ui/               # Shared UI components
│   ├── api/              # Backend API (Fastify)
│   ├── worker/           # Background workers (BullMQ)
│   └── shared/           # Shared types, utils
├── docker/
│   ├── docker-compose.yml
│   └── docker-compose.prod.yml
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── deploy.yml
├── turbo.json            # Turborepo config
├── package.json
└── tsconfig.json
```

### Scripts

```json
{
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:seed": "tsx packages/db/seed.ts"
  }
}
```

### Docker Compose (local)

```yaml
services:
  postgres:
    image: postgres:16
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: pricehunt
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    
  redis:
    image: redis:7
    ports:
      - "6379:6379"
    
  meilisearch:
    image: getmeili/meilisearch:v1.6
    ports:
      - "7700:7700"
```

### CI/CD

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run lint
      - run: npm run test
      - run: npm run build
```

---

## 32. TESTING

### Estrategia de testing

| Tipo | Herramienta | Cobertura | Velocidad |
|------|-------------|-----------|-----------|
| **Unit** | Vitest | 80%+ | Rápido |
| **Integration** | Vitest | API endpoints | Medio |
| **E2E** | Playwright | Flujos críticos | Lento |
| **Load** | k6 | Performance | Lento |
| **Pricing** | Custom | Price engine | Rápido |

### PRICE ENGINE TESTING (crítico)

```typescript
describe('Price Engine', () => {
  it('should never sell below cost', () => {
    const cost = 100;
    const price = calculatePrice(cost, strategy);
    expect(price).toBeGreaterThanOrEqual(cost);
  });
  
  it('should maintain minimum margin', () => {
    const minMargin = 0.02; // 2%
    const price = calculatePrice(100, strategy);
    const margin = (price - 100) / 100;
    expect(margin).toBeGreaterThanOrEqual(minMargin);
  });
  
  it('should be competitive when possible', () => {
    const competitorPrice = 105;
    const ourPrice = calculatePrice(100, strategy, competitorPrice);
    expect(ourPrice).toBeLessThanOrEqual(competitorPrice);
  });
});
```

### Supplier mocks

```typescript
const mockSupplier = {
  getProduct: vi.fn().mockResolvedValue({
    price: 95,
    shipping: 5,
    in_stock: true,
    delivery_days: 7
  }),
  placeOrder: vi.fn().mockResolvedValue({
    order_id: 'MOCK-001',
    status: 'confirmed'
  })
};
```

### Failure injection

```typescript
describe('Order routing with failures', () => {
  it('should fallback to next supplier on failure', async () => {
    supplierA.placeOrder.mockRejectedValue(new Error('Out of stock'));
    supplierB.placeOrder.mockResolvedValue({ order_id: '002' });
    
    const result = await routeOrder(order);
    expect(result.supplier).toBe('B');
  });
});
```

---

## 33. REPRODUCIBILIDAD DEL PRECIO

### Cada precio mostrado debe poder explicarse

```typescript
interface PriceExplanation {
  timestamp: string;
  source: string;
  supplier: string;
  product: string;
  variant: string;
  product_price: number;
  shipping: number;
  tax: number;
  fees: number;
  exchange_rate: number;
  final_cost: number;
  competitor_price: number;
  our_price: number;
  pricing_rule: string;
  algorithm_version: string;
}
```

###-storage

Cada `current_prices` row debe tener un `price_explanation` JSONB:

```json
{
  "timestamp": "2024-01-15T14:32:00Z",
  "source": "aliexpress_api",
  "supplier": "aliexpress",
  "product": "iPhone 15 Case",
  "variant": "Black/Medium",
  "product_price": 8.50,
  "shipping": 3.20,
  "tax": 1.89,
  "fees": 0.50,
  "exchange_rate": 17.15,
  "final_cost": 143.75,
  "competitor_price": 155.00,
  "our_price": 149.99,
  "pricing_rule": "strategy_a_competitor_minus_1",
  "algorithm_version": "1.2.3"
}
```

### Esto nos permite responder

- "¿Por qué el producto costaba $106 a las 14:32?"
- "¿Qué proveedor se usó?"
- "¿Qué regla de pricing se aplicó?"
- "¿Cuál era el costo real?"

---

## 34. VERSIONING

### Qué versionar

| Componente | Estrategia | Herramienta |
|------------|------------|-------------|
| **Pricing algorithms** | Semver (major.minor.patch) | Git tags + DB |
| **Matching algorithms** | Semver | Git tags + DB |
| **Supplier adapters** | Semver | Git tags |
| **DB migrations** | Sequential (001, 002, ...) | Drizzle |
| **APIs** | URL versioning (/v1/, /v2/) | Fastify routes |
| **ML models** | Semver + hash | Model registry |

### Rollback strategy

```typescript
// Price engine versioning
interface PricingAlgorithm {
  version: string;
  execute: (input: PricingInput) => PricingOutput;
}

// Store algorithm version with each price
interface PriceRecord {
  algorithm_version: string;
  // ... other fields
}

// Rollback: just change active algorithm version
```

---

## 35. ROADMAP

### Phase 0 — Research (2-4 semanas)

**Features:**
- Validar ToS de cada fuente potencial
- Investigar APIs disponibles
- Analizar competencia
- Validar modelo de negocio

**Infraestructura:** N/A
**Equipo:** 1 persona
**Costo:** $0
**Riesgos:** Que las fuentes no permitan integración
**Criterio de éxito:** Documento de fuentes viables

### Phase 1 — MVP (8-12 semanas)

**Features:**
- Pegar URL → identificar producto
- Buscar en 1-2 fuentes
- Mostrar precio
- Checkout básico
- Order tracking básico

**Infraestructura:** Hetzner VPS
**Equipo:** 1-2 personas
**Costo:** $100-300/mes
**Riesgos:** Matching inexacto, precios desactualizados
**Criterio de éxito:** 100 órdenes completadas

### Phase 2 — Production (12-16 semanas)

**Features:**
- 5+ fuentes de datos
- Matching mejorado
- Shipping engine
- Tax engine
- Admin panel
- Monitoring

**Infraestructura:** Hetzner + Vercel
**Equipo:** 2-3 personas
**Costo:** $500-1,000/mes
**Riesgos:** Escalabilidad, soporte
**Criterio de éxito:** 1,000 órdenes/mes

### Phase 3 — Scale (6-12 meses)

**Features:**
- Búsqueda por imagen
- Extensión de navegador
- Más fuentes
- Programa de afiliados
- Analytics avanzado

**Infraestructura:** AWS/GCP
**Equipo:** 3-5 personas
**Costo:** $3,000-8,000/mes
**Riesgos:** Competencia, costos crecientes
**Criterio de éxito:** 10,000 órdenes/mes

### Phase 4 — Direct Suppliers (12-18 meses)

**Features:**
- Acuerdos directos con proveedores
- Mejores precios
- Exclusividad en productos
- Negociación automática

**Infraestructura:** AWS/GCP
**Equipo:** 5-10 personas
**Costo:** $10,000-20,000/mes
**Riesgos:** Negociaciones fallidas
**Criterio de éxito:** 30% de órdenes vía acuerdos directos

### Phase 5 — Intelligent Purchasing Network (18-24 meses)

**Features:**
- Predictive purchasing
- Auto-negotiation
- Multi-country
- B2B marketplace
- White-label

**Infraestructura:** Multi-region
**Equipo:** 10+ personas
**Costo:** $20,000-50,000/mes
**Riesgos:** Complejidad operativa
**Criterio de éxito:** 100,000 órdenes/mes

---

## 36. MVP MÍNIMO

### Flujo del MVP

```
Usuario pega URL de TikTok/Amazon/AliExpress
  ↓
Sistema identifica el producto (título, imagen, precio)
  ↓
Busca en 1-2 fuentes alternativas
  ↓
Muestra mejor oferta encontrada
  ↓
Calcula nuestro precio (margen mínimo)
  ↓
Checkout (guest, Stripe/Conekta)
  ↓
Orden creada
  ↓
Compra al proveedor (manual o semi-automática)
  ↓
Tracking al usuario
```

### Stack del MVP

- **Frontend:** Next.js (Vercel)
- **Backend:** Node.js + Fastify (Hetzner)
- **DB:** PostgreSQL (Hetzner)
- **Cache:** Redis (Hetzner)
- **Queue:** BullMQ (Hetzner)
- **AI:** OpenAI API
- **Payments:** Conekta
- **Email:** Resend

### Qué SÍ tiene el MVP
- Identificación de producto desde URL
- Matching básico (texto)
- 2-3 fuentes de datos
- Precio final calculado
- Checkout funcional
- Order tracking básico
- Email transaccional

### Qué NO tiene el MVP
- Búsqueda por imagen
- Extensión de navegador
- App móvil
- Admin panel completo
- Analytics avanzado
- Múltiples proveedores por orden
- Programa de afiliados

---

## 37. MVP EXPERIMENTAL

### Objetivo validar

**¿Las personas realmente quieren pegar un producto de TikTok y comprarlo más barato en otra página?**

### Diseño del MVP experimental

**Una sola página web con:**
1. Input para pegar URL de TikTok
2. Botón "Encontrar mejor precio"
3. Resultado: mostrar si encontramos más barato
4. Si sí → formulario de email para notificar cuando esté listo
5. Si no → mostrar precio actual y alternativas

### Stack del MVP experimental

- **Frontend:** Next.js (Vercel)
- **Backend:** Serverless functions (Vercel)
- **DB:** Supabase (gratis)
- **AI:** OpenAI API
- **Sin checkout real**
- **Sin proveedores reales**

### Métricas a validar

1. **Tasa de uso:** ¿Cuántas personas pegan URLs?
2. **Tasa de conversión:** ¿Cuántas quieren comprar?
3. **Fuentes de tráfico:** ¿De dónde vienen?
4. **Productos buscados:** ¿Qué categorías son populares?

### Tiempo de construcción

**2-4 semanas** con 1 desarrollador

### Criterio de éxito

- 100+ URLs pegadas en 2 semanas
- 30%+ tasa de interés (emails capturados)
- Identificación de 3+ categorías populares

---

## 38. DECISION LOG

| Decisión | Opciones | Elegida | Razón | Cuándo reconsiderar |
|----------|----------|---------|-------|---------------------|
| **Arquitectura** | Monolito, Microservicios, Modular monolith | Modular monolith | Balance entre simplicidad y escalabilidad | 100k usuarios |
| **Frontend** | Next.js, Remix, SPA | Next.js | SSR para SEO, Vercel deploy | Si necesitamos app móvil |
| **Backend** | Node.js, Python, Go | Node.js (Fastify) | Type safety con frontend, performance | Si CPU-bound crítico |
| **Database** | PostgreSQL, MySQL, MongoDB | PostgreSQL | JSONB, full-text, madurez | Si NoSQL es mejor para un caso |
| **Cache** | Redis, Memcached | Redis | Queues + cache en uno | Nunca |
| **Queue** | BullMQ, RabbitMQ, Kafka | BullMQ | Simple, Redis-based | Si necesitamos event sourcing |
| **Search** | PostgreSQL, Meilisearch, Elasticsearch | PostgreSQL → Meilisearch | Empezar simple | 100k productos |
| **AI** | OpenAI, open source | OpenAI | Calidad, DX | Si costos suben mucho |
| **Payments** | Stripe, Conekta, Mercado Pago | Conekta | México-optimized | Si expandimos a otros países |
| **CDN** | Cloudflare, AWS CloudFront | Cloudflare | Gratis, DDoS protection | Nunca |
| **Hosting** | Hetzner, AWS, GCP | Hetzner (MVP) → AWS (scale) | Costo inicial, escalabilidad | 100k usuarios |
| **Email** | SendGrid, Resend, SES | Resend | Moderno, React Email | Si necesitamos más features |
| **Error tracking** | Sentry, Rollbar | Sentry | Free tier generoso | Nunca |
| **Testing** | Jest, Vitest | Vitest | Más rápido, ESM | Nunca |

---

## 39. RISK MATRIX

| Riesgo | Probabilidad | Impacto | Mitigation |
|--------|--------------|---------|------------|
| **ToS violation por scraping** | Media | Crítico | Usar solo APIs oficiales y feeds autorizados |
| **Proveedores bloquean acceso** | Media | Alto | Múltiples fuentes, cache, acuerdos oficiales |
| **Márgenes insuficientes** | Alta | Alto | Volume-based revenue, direct supplier deals |
| **Matching incorrecto** | Media | Alto | Validación humana, feedback loop, UMBRELA de confianza |
| **Precio cambia post-checkout** | Alta | Alto | Pre-purchase verification, absorber diferencias pequeñas |
| **Proveedor no cumple** | Media | Alto | SLA monitoring, fallback suppliers, escrow |
| **Fraude** | Baja | Crítico | Velocity checks, manual review, block suspicious |
| **Competencia responde** | Alta | Medio | First-mover advantage, data moat, UX |
| **Regulación cambia** | Baja | Crítico | Legal counsel, flexible architecture |
| **Escalabilidad insuficiente** | Baja | Alto | Architecture designed for scale, cloud migration path |
| **AI costos suben** | Media | Medio | Open source models, caching, selective use |
| **Equipo no alcanza** | Media | Alto | Priorización estricta, MVP realista |
| **Usuarios no adoptan** | Media | Crítico | Validación temprana, pivot rápido |
| **Pagos fallan** | Baja | Crítico | Múltiples providers, retry logic |
| **Data breach** | Baja | Crítico | Encryption, minimal PII, security audit |

---

## 40. "WHAT ARE WE MISSING?"

### Puntos ciegos identificados

#### 1. **Multi-moneda real**
- ¿Qué pasa cuando un proveedor cobra en USD y el usuario paga en MXN?
- Necesitamos hedging o conversión en tiempo real
- **Mitigación:** Lock exchange rate at checkout, absorber small fluctuations

#### 2. **Garantías y devoluciones**
- ¿Quién maneja garantías? ¿Nosotros o el proveedor?
- ¿Cómo procesamos devoluciones?
- **Mitigación:** Política clara, proveedores confiables, seguro de devolución

#### 3. **Fraude de proveedores**
- ¿Qué pasa si un proveedor envía producto falso?
- **Mitigación:** Rating de proveedores, inspección aleatoria, seguro

#### 4. **Impuestos internacionales**
- ¿Cómo manejamos IVA en importaciones?
- ¿DDP vs DDU?
- **Mitigación:** Consultar con contador,开始 con DDP simple

#### 5. **Scaler más allá de México**
- ¿Multi-idioma? ¿Multi-moneda? ¿Multi-legal?
- **Mitigación:** Preparar desde el principio pero no implementar aún

#### 6. **Mobile app**
- Los usuarios de TikTok están en mobile
- ¿Web app es suficiente?
- **Mitigación:** PWA para MVP, app nativa después

#### 7. **Soporte al cliente**
- ¿Quién responde preguntas?
- ¿Chat en vivo? ¿Email? ¿Phone?
- **Mitigación:** Email + FAQ para MVP, chat después

#### 8. **SEO**
- ¿Cómo genera tráfico orgánico?
- **Mitigación:** Product pages con SSR, blog de ofertas

#### 9. **Social proof**
- ¿Reseñas? ¿Ratings?
- **Mitigación:** Fase 2

#### 10. **Programa de referidos**
- ¿Cómo crece viralmente?
- **Mitigación:** Fase 2

#### 11. **Contenido**
- ¿Blog? ¿Comparativas? ¿Guías?
- **Mitigación:** Fase 2

#### 12. **Customer lifetime value**
- ¿Cómo retenemos usuarios?
- **Mitigación:** Email de ofertas, wishlist, price alerts

---

## RECOMENDACIÓN FINAL

### Para empezar MAÑANA

1. **Validar ToS** de AliExpress, Amazon, Mercado Libre
2. **Construir MVP experimental** (2-4 semanas)
3. **Validar con 100 usuarios reales**
4. **Si validado:** Construir MVP real (8-12 semanas)
5. **Si no validado:** Pivotar o abandonar

### Stack mínimo para empezar

```
Next.js + Fastify + PostgreSQL + Redis + BullMQ + Conekta
```

### Presupuesto mínimo

- **Desarrollo:** 1-2 desarrolladores full-time
- **Infraestructura:** $100/mes
- **AI:** $50/mes
- **Total:** ~$150/mes + salarios

### Primer commit

```bash
# Day 1
npx create-turbo@latest pricehunt
# Configurar PostgreSQL schema
# Configurar Next.js basics
# Configurar Fastify server
```

### Criterio de éxito del MVP

- 100 órdenes completadas
- 70%+ tasa de satisfacción
- Margen promedio > 2%
- 0 errores críticos

---

**Estado:** Planificación completa
**Siguiente paso:** Validación de ToS + MVP experimental
**Fecha:** 2026-08-28
