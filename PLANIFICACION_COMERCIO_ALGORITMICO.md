# PRICEHUNT — RESTRUCTURED PRODUCT & ARCHITECTURE PLANNING

---

## 1. Executive Summary

**PriceHunt** is not a price comparison tool. It is a **product verification system**.

The core question PriceHunt answers is:

> "I found this product on TikTok Shop / Amazon / wherever. Is this actually the best deal I can get?"

**Critical distinction:** PriceHunt does NOT promise to always be cheaper. It promises to **check if a better deal actually exists.** Sometimes the answer is "TikTok Shop is already the best option." That is a valid and trustworthy result.

**Why this matters:** If PriceHunt always claims to find cheaper alternatives, it will lie to users and destroy trust. The product's value is **honesty**, not always winning.

**North Star Metric:** Customer Savings Score — weighted combination of Best Offer Rate + Average Savings + Match Accuracy + Fulfillment Success.

**Market:** Mexico. Mobile-first. TikTok-native users aged 18-45.

**Stack:** Next.js 14 + Fastify + TypeScript + PostgreSQL 16 + Redis 7 + BullMQ + Meilisearch + Conekta.

**Architecture:** Modular monolith with background workers. Migrable to services at 100k+ users.

**Status:** MVP Phase 1a nearly complete (code written, 54 tests passing). This document restructures planning before continuing development.

---

## 2. Current Project Assessment

### What Exists

| Component | Status | Quality |
|-----------|--------|---------|
| Turborepo monorepo | ✅ Complete | Good |
| DB schema (19 tables) | ✅ Complete | Needs review |
| URL parser | ✅ Complete, tested | Good |
| Matching engine (Jaccard + GTIN) | ✅ Complete, tested | Basic — needs improvement |
| Pricing engine (5 strategies) | ✅ Complete, tested | Good |
| Supplier adapters (8) | ✅ Written | Skeleton — need real data |
| Ingestion service | ✅ Written | Basic |
| Meilisearch integration | ✅ Written | Basic |
| BullMQ workers (ingestion + matching) | ✅ Written | Not yet running |
| API routes (7 endpoints) | ✅ Written | Not tested end-to-end |
| Frontend (Next.js) | 🟡 Scaffolded | Pages exist but basic |
| Tests (54) | ✅ Passing on VM | Good coverage |
| Azure VM (Docker) | ✅ Running | Postgres + Redis + Meilisearch |

### What's Wrong

1. **The matching engine is too basic.** Jaccard similarity on titles is insufficient for real product matching. We need GTIN/MPN deterministic matching, brand awareness, and eventually image matching.

2. **Supplier adapters are skeletons.** Amazon, eBay, Walmart, SHEIN, Temu adapters exist but have never fetched real data. They need to be tested against real products.

3. **No delivery model.** The system doesn't track delivery times, shipping costs, or inventory location. This is critical given TikTok Shop's logistics advantage.

4. **No data confidence levels.** Everything is treated as confirmed. We need `confirmed / estimated / unknown` states.

5. **No price explanation traceability.** We can't answer "why did PriceHunt show this price?"

6. **The original plan is overengineered.** Kafka, Kubernetes, multi-country, browser extension, native mobile — none of this is needed for validation.

7. **No real experiment design.** The plan mentions "100 users" but doesn't specify what to measure or how.

### What's Good

1. The core thesis is sound.
2. The monorepo structure is clean.
3. The DB schema covers most entities needed.
4. TypeScript everywhere reduces context-switching.
5. The modular architecture allows incremental development.

---

## 3. What Changed

### The TikTok Shop Insight

TikTok Shop is not just another source. It is:

- **The primary trigger** (user sees product on TikTok)
- **A logistics competitor** (local inventory, fast shipping, subsidized delivery)
- **A pricing competitor** (aggressive promotions, coupons, temporary discounts)
- **The benchmark** (PriceHunt must beat or honestly say it can't)

### Implications

| Before | After |
|--------|-------|
| Price = most important variable | Price + Delivery + Confidence = equally important |
| Any cheaper alternative wins | Only alternatives that are genuinely better win |
| PriceHunt always finds cheaper | PriceHunt checks IF cheaper exists |
| TikTok is just a URL source | TikTok is the primary context |
| Shipping is a line item | Shipping is a first-class variable |
| All delivery estimates treated equally | Delivery confidence matters |

### New Core Thesis

> **"PriceHunt doesn't promise to always be cheaper than TikTok Shop. PriceHunt promises to check if a better deal actually exists."**

This means PriceHunt must be capable of saying:
- "We found an option 25% cheaper." ✅
- "TikTok Shop is already the best option." ✅ (equally valid)

---

## 4. Core Product Thesis

### Hypothesis

> Mexican consumers who discover products on TikTok Shop (and similar platforms) would use a tool that tells them whether they're getting the best deal, including price, delivery time, and supplier reliability.

### Value Proposition

1. **Honesty:** We tell you the truth, even if the truth is "you already found the best deal."
2. **Comprehensive comparison:** Not just price — landed cost, delivery, stock, supplier confidence.
3. **Speed:** Paste URL → get answer in seconds.
4. **Trust:** Every result is explainable and traceable.

### Anti-theses (What PriceHunt is NOT)

- NOT a price comparison site that always claims to win
- NOT a marketplace (we don't hold inventory)
- NOT a dropshipping service (initially)
- NOT a coupon aggregator
- NOT a price alert tool (initially)

---

## 5. Updated User Journey

### Primary Flow: TikTok Discovery

```
1. User sees product on TikTok/TikTok Shop
2. User copies URL
3. User opens PriceHunt (web app)
4. User pastes URL
5. PriceHunt identifies product (title, image, price, delivery)
6. PriceHunt searches across suppliers
7. PriceHunt calculates landed cost for each match
8. PriceHunt ranks by: Cheapest / Fastest / Best Overall
9. PriceHunt shows results with confidence levels
10. User decides:
    a. "PriceHunt found better" → Buy through PriceHunt
    b. "TikTok is already best" → User keeps TikTok option
    c. "Similar product exists" → User evaluates trade-off
```

### Alternative Flows

- **Text search:** User types product name → same flow from step 6
- **Image search:** (Phase 2) User uploads photo → reverse search → same flow
- **Direct URL:** User has Amazon/AliExpress URL → same flow from step 5

### Key UX Principle

**Never hide the truth.** If TikTok Shop wins, say so clearly. If we can't find a match, say so. If delivery is unknown, say so.

---

## 6. Updated Architecture

### Principles

1. **Modular monolith** until 100k users
2. **Workers separate** for crawling/pricing (CPU-intensive)
3. **No premature microservices**
4. **Data confidence as a first-class concept**
5. **Every price must be explainable**

### Layer Structure

```
┌─────────────────────────────────────────────────┐
│              CLIENT LAYER                        │
│  Next.js (Web App) — Vercel/Pages               │
└─────────────────────┬───────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────┐
│              API LAYER                           │
│  Fastify + TypeScript                            │
│  Routes: /identify, /search, /offers, /checkout │
└─────────────────────┬───────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────┐
│           APPLICATION LAYER                      │
│  Ingestion → Matching → Pricing → Ranking        │
│  (all in-process, modular monolith)              │
└─────────────────────┬───────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────┐
│            WORKER LAYER                          │
│  BullMQ: Crawler, Price Update, Order Processing │
│  (separate process, scalable independently)      │
└─────────────────────┬───────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────┐
│             DATA LAYER                           │
│  PostgreSQL + Redis + Meilisearch                │
└─────────────────────┬───────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────┐
│          SOURCE ADAPTERS LAYER                   │
│  AliExpress | Amazon | ML | eBay | Walmart | ... │
│  Each adapter implements: identify, search,      │
│  getProduct, getPrice                           │
└─────────────────────────────────────────────────┘
```

### What Stays as Monolith

- Product ingestion (orchestration only)
- Matching (CPU-bound but fast enough in-process)
- Pricing (deterministic, fast)
- Ranking/scoring
- Checkout/order management
- API routing

### What Eventually Separates

- **Crawler service** (at 100k+ products, needs independent scaling)
- **Pricing engine** (at 100k+ SKUs, needs independent refresh cycles)
- **Order service** (at 10k+ orders/month, needs transaction isolation)
- **Analytics pipeline** (at 100k+ events/day, needs stream processing)

### NOT Needed

- Kafka (BullMQ is sufficient for MVP through 100k users)
- Kubernetes (single VPS is fine for MVP)
- Microservices (modular monolith is correct for this stage)
- GraphQL (REST is sufficient)
- Elasticsearch (Meilisearch handles search needs)

---

## 7. Source Taxonomy

### Categories

| Category | Description | Examples |
|----------|-------------|----------|
| **Marketplace** | Platform connecting buyers and sellers | Amazon, MercadoLibre, eBay, Walmart, TikTok Shop, Facebook Marketplace |
| **Retailer** | Sells directly to consumers | Liverpool, Palacio de Hierro, Costco, Coppel, Sears, Sanborns, Home Depot, Office Depot |
| **Chinese Marketplace** | Platforms connecting Chinese manufacturers to buyers | AliExpress, Temu, SHEIN, DHgate, Banggood, Geekbuying |
| **Wholesale/B2B** | Bulk purchasing platforms | Alibaba, 1688, Chinagoods, Yiwugo, Made-in-China, Global Sources, HKTDC |
| **Dropshipping Intermediary** | Platforms for resellers | CJdropshipping, Chinavasion, Tomtop, Spocket |
| **Delivery Platform** | Local delivery services | Rappi, DiDi Store |
| **Manufacturer Directory** | Directories of manufacturers | IndiaMART, TradeIndia |
| **Retail Wholesale** | Wholesale for retailers | Faire, Tundra, Wholesale Central, SaleHoo |
| **Social Commerce** | Commerce on social platforms | TikTok Shop |

### Source Viability Assessment

#### Tier 1: Core Sources (MVP)

| Source | Type | Access Method | Legal? | Viable? | Notes |
|--------|------|---------------|--------|---------|-------|
| AliExpress | Chinese Marketplace | Affiliate API (Admitad) | ✅ Yes | ✅ Yes | Best for cross-border comparison |
| Amazon MX | Marketplace | Product Advertising API | ✅ Yes | ✅ Yes | Largest selection in Mexico |
| MercadoLibre | Marketplace | Public API | ✅ Yes | ✅ Yes | Largest marketplace in LATAM |
| eBay | Marketplace | Browse API | ✅ Yes | ✅ Yes | Good for international products |
| Walmart MX | Marketplace/Retailer | Scraping (public pages) | ⚠️ Check ToS | ⚠️ Maybe | Large selection, prices need verification |

#### Tier 2: Secondary Sources (Post-MVP)

| Source | Type | Access Method | Legal? | Viable? | Notes |
|--------|------|---------------|--------|---------|-------|
| SHEIN | Chinese Marketplace | Scraping | ⚠️ Check ToS | ⚠️ Maybe | Fashion-focused, anti-bot measures |
| Temu | Chinese Marketplace | Scraping | ⚠️ Check ToS | ⚠️ Maybe | Growing fast, anti-bot measures |
| TikTok Shop | Social Commerce | URL extraction only | ⚠️ No official API | ⚠️ Limited | Can extract product info from URLs |
| Liverpool | Retailer | Scraping | ⚠️ Check ToS | ⚠️ Maybe | Mexican department store |
| Palacio de Hierro | Retailer | Scraping | ⚠️ Check ToS | ⚠️ Maybe | Luxury segment |
| Costco | Retailer | No public data | ❌ No | ❌ No | Membership required, no API |

#### Tier 3: Chinese Wholesale (Future)

| Source | Type | Access Method | Legal? | Viable? | Notes |
|--------|------|---------------|--------|---------|-------|
| Alibaba | B2B | Affiliate API | ✅ Yes | ✅ Yes | Best for wholesale pricing reference |
| 1688 | Wholesale (CN) | No public API | ❌ No | ❌ No | Chinese-only, no international API |
| Chinagoods | Wholesale (CN) | No public API | ❌ No | ❌ No | Chinese-only |
| Yiwugo | Wholesale (CN) | No public API | ❌ No | ❌ No | Chinese-only |
| DHgate | Marketplace | Affiliate program | ⚠️ Check | ⚠️ Maybe | Smaller than AliExpress |
| Banggood | Marketplace | Affiliate program | ⚠️ Check | ⚠️ Maybe | Similar to AliExpress |
| CJdropshipping | Dropshipping | API | ✅ Yes | ✅ Yes | Good for wholesale pricing |

#### Tier 4: Not Viable for MVP

| Source | Reason |
|--------|--------|
| Made-in-China | Requires manufacturer relationship |
| Global Sources | B2B, requires trade shows |
| HKTDC | B2B, requires registration |
| IndiaMART | India-focused, not relevant for Mexico |
| TradeIndia | India-focused |
| Faire | US-focused wholesale |
| Tundra | US-focused wholesale |
| Wholesale Central | US-focused |
| SaleHoo | Subscription-based directory |
| Facebook Marketplace | No API, login required, ToS prohibits |

### Source Reliability Model

Each source should track:
- **Uptime:** % of time the adapter works
- **Data freshness:** How old is the data
- **Data quality:** % of results with complete information
- **Rate limit compliance:** Are we respecting limits
- **Legal status:** Is our access method approved

---

## 8. Supplier Reliability Model

### Critical Distinction: Source ≠ Supplier

**Source** = The platform (Amazon, AliExpress, MercadoLibre)
**Supplier** = The individual seller on that platform

A platform can be legitimate while containing terrible suppliers.

### Source Reliability

| Factor | Weight | Measurement |
|--------|--------|-------------|
| API availability | High | Uptime % |
| Data completeness | High | % of products with full data |
| Rate limit friendliness | Medium | Requests per minute allowed |
| Legal clarity | High | Clear ToS |
| Price accuracy | High | % match between API and website |

### Supplier Reliability

| Factor | Weight | Measurement |
|--------|--------|-------------|
| Verification status | High | Verified / Unverified |
| Time operating | Medium | Months/years on platform |
| Rating | High | Platform rating (1-5 stars) |
| Number of sales | Medium | Total transactions |
| Return rate | High | % of orders returned |
| Response time | Medium | Average response time |
| Stock consistency | High | % of time item is in stock |
| Price consistency | Medium | Price volatility over time |
| Shipping fulfillment | High | % of orders shipped on time |
| Product quality | Medium | Average review rating |
| Certifications | Low | Relevant certifications |

### Supplier Score Calculation

```
supplier_score = (
    0.25 * verification_score +
    0.20 * rating_score +
    0.20 * fulfillment_score +
    0.15 * stock_consistency +
    0.10 * time_operating +
    0.10 * return_rate_inverse
)
```

### States

- **Verified:** Platform-verified seller with history
- **Established:** Operating >6 months with >100 sales
- **New:** Operating <6 months or <100 sales
- **Unknown:** Insufficient data
- **Blocked:** Supplier flagged for issues

---

## 9. Product Matching Model

### Match Types

| Type | Confidence | Description | Action |
|------|------------|-------------|--------|
| **Exact** | 0.95-1.00 | Same product, same variant, same GTIN/MPN | Show as "same product" |
| **Strong** | 0.85-0.94 | Very likely same product, multiple evidence points | Show with note "very likely same" |
| **Similar** | 0.70-0.84 | Similar product, possibly different variant | Show with note "similar product" |
| **Weak** | 0.50-0.69 | Possibly related, low confidence | Show only if user expands search |
| **Invalid** | <0.50 | Not a match | Don't show |

### Matching Data Points

#### Deterministic (Highest Priority)

| Signal | Weight | Notes |
|--------|--------|-------|
| GTIN/EAN/UPC match | 1.0 (definitive) | If GTINs match, it's the same product |
| MPN + Brand match | 0.95 | Manufacturer part number + brand |
| SKU match (same platform) | 0.90 | Only within same platform |

#### Semantic (High Priority)

| Signal | Weight | Notes |
|--------|--------|-------|
| Title similarity | 0.30 | Jaccard + tokenization |
| Brand match | 0.15 | Exact brand match bonus |
| Category match | 0.10 | Same category bonus |
| Description similarity | 0.10 | TF-IDF or embeddings |
| Attribute match | 0.15 | Color, size, capacity, etc. |
| Price range | 0.05 | Products in similar price range |
| Image similarity | 0.15 | Perceptual hash + CLIP (Phase 2) |

#### Classification Rules

```
if gtin_match:
    return ExactMatch(confidence=1.0)

if mpn_match and brand_match:
    return ExactMatch(confidence=0.95)

if title_score > 0.85 and brand_match and price_range_close:
    return StrongMatch(confidence=combined_score)

if title_score > 0.70 and (brand_match or category_match):
    return SimilarMatch(confidence=combined_score)

if title_score > 0.50:
    return WeakMatch(confidence=combined_score)

return NoMatch
```

### What NOT to Match

- Different products in same category
- Different color/size variants (show as variant, not match)
- Accessories vs. main products
- Generic vs. branded

---

## 10. Landed Cost Model

### Formula

```
landed_cost = (
    product_price
    + shipping_cost
    + import_duties (if applicable)
    + taxes (IVA 16%)
    + payment_processing_fee
    + currency_conversion_fee (if applicable)
    + other_mandatory_costs
)
```

### Component Breakdown

| Component | Source | Confidence |
|-----------|--------|------------|
| Product price | Supplier API/scraping | High |
| Shipping cost | Supplier API / estimation | Medium-Low |
| Import duties | Calculation based on HS code | Medium |
| IVA (16%) | Calculation | High |
| Payment fees | Conekta (2.9% + $2.50 MXN) | High |
| Exchange rate | Exchange rate API | High (real-time) |

### Shipping Confidence Levels

| Level | Description | Example |
|-------|-------------|---------|
| **Confirmed** | Exact shipping cost from API | "$45.00 MXN via Estafeta" |
| **Estimated** | Based on historical data or calculator | "Estimated $30-60 MXN" |
| **Free** | Confirmed free shipping | "$0 — Envío gratis" |
| **Unknown** | Cannot determine | "Shipping cost unknown" |

### Import Duties (for cross-border)

- **De minimis:** Orders under $50 USD may be exempt
- **Standard rate:** 16% IVA + potential duties based on HS code
- **DDP (Delivered Duty Paid):** Supplier handles taxes
- **DDU (Delivered Duty Unpaid):** Customer pays at customs

### Currency Conversion

```
If supplier_currency != 'MXN':
    exchange_rate = get_exchange_rate(supplier_currency, 'MXN')
    exchange_fee = 0.02  // 2% typical bank/conversion fee
    converted_price = product_price * exchange_rate * (1 + exchange_fee)
```

---

## 11. Delivery Model

### Delivery as First-Class Variable

Every offer must include delivery information:

```typescript
interface DeliveryEstimate {
  min_days: number | null;
  max_days: number | null;
  confidence: 'confirmed' | 'estimated' | 'unknown';
  source: string;  // where this estimate came from
  shipping_cost: number;
  shipping_provider: string | null;
  free_shipping: boolean;
  ships_from: 'Mexico' | 'China' | 'US' | 'Other' | 'Unknown';
  tracking_available: boolean;
}
```

### Delivery Confidence

| Level | Criteria | Example |
|-------|----------|---------|
| **Confirmed** | API returns exact delivery date | "Entrega: 28 agosto 2026" |
| **Estimated (High)** | Platform provides range + historical accuracy >90% | "2-4 días hábiles" |
| **Estimated (Low)** | Platform provides range or we estimate | "7-21 días" |
| **Unknown** | No data available | "Tiempo de entrega desconocido" |

### Inventory Location Impact

| Location | Typical Delivery to MX | Cost Impact |
|----------|----------------------|-------------|
| Mexico warehouse | 1-3 days | Low shipping |
| US warehouse | 3-7 days | Medium shipping |
| China warehouse | 7-21 days | Variable shipping |
| Unknown | Unknown | Unknown |

### TikTok Shop Delivery Advantage

TikTok Shop often has:
- Local inventory in Mexico
- Subsidized shipping
- 1-2 day delivery on popular items
- Free shipping promotions

**PriceHunt must account for this.** A $399 product with 12-day delivery from China is NOT necessarily better than a $499 product with 1-day delivery from TikTok.

---

## 12. PriceHunt Ranking Model

### Ranking Dimensions

| Dimension | Weight | Description |
|-----------|--------|-------------|
| **Price** | 40% | Landed cost (all-in price) |
| **Delivery** | 25% | Speed + confidence + cost |
| **Supplier confidence** | 15% | Supplier reliability score |
| **Match quality** | 10% | How confident we are it's the same product |
| **Stock availability** | 10% | Is it actually in stock |

### Ranking Outputs

#### Cheapest
```
cheapest_rank = sort by landed_cost ASC
```

#### Fastest
```
fastest_rank = sort by delivery_min_days ASC
(tiebreak: delivery_confidence DESC)
```

#### Best Overall
```
best_score = (
    0.40 * price_score +
    0.25 * delivery_score +
    0.15 * supplier_score +
    0.10 * match_score +
    0.10 * stock_score
)

best_overall_rank = sort by best_score DESC
```

### Price Score Calculation

```
if no_competitor:
    price_score = 0.5  // neutral

if competitor_exists:
    price_score = 1 - (our_price - min_price) / min_price
    // If we are the cheapest: score = 1.0
    // If we are 20% more expensive: score = 0.8
```

### Delivery Score Calculation

```
delivery_score = (
    0.5 * speed_score +
    0.3 * confidence_score +
    0.2 * cost_score
)

speed_score = 1 - (delivery_days - 1) / 30
// 1 day = 1.0, 30 days = 0.0

confidence_score = 1.0 if confirmed
                 = 0.7 if estimated_high
                 = 0.4 if estimated_low
                 = 0.1 if unknown
```

### When PriceHunt Says "TikTok Wins"

If the TikTok Shop offer has:
- Best or near-best price (within 5%)
- Best delivery (fastest)
- Confirmed stock

Then PriceHunt should display:

> **"TikTok Shop is already a great option for this product."**
> - Price: $499 MXN (competitive)
> - Delivery: 1 day (fastest available)
> - We found alternatives but none are clearly better.

---

## 13. Data Model

### Core Entities

#### Product (Canonical)
```
Product {
    id: UUID
    canonical_name: text
    slug: varchar (unique)
    brand_id: FK → Brand
    category_id: FK → Category
    gtin: varchar (nullable)
    mpn: varchar (nullable)
    description: text
    attributes: jsonb
    created_at: timestamp
    updated_at: timestamp
}
```

#### ProductVariant
```
ProductVariant {
    id: UUID
    product_id: FK → Product
    sku: varchar
    name: varchar
    attributes: jsonb  // color, size, capacity, etc.
    created_at: timestamp
}
```

#### Source (Platform)
```
Source {
    id: UUID
    name: varchar
    slug: varchar (unique)
    type: varchar  // marketplace, retailer, wholesale, etc.
    base_url: text
    adapter_type: varchar  // api, scraping, feed
    is_active: boolean
    reliability_score: decimal
    last_health_check: timestamp
    health_status: varchar  // healthy, degraded, down
    config: jsonb
    created_at: timestamp
}
```

#### Supplier (Individual Seller)
```
Supplier {
    id: UUID
    source_id: FK → Source
    supplier_id_on_source: varchar  // seller ID on the platform
    name: varchar
    is_verified: boolean
    rating: decimal
    total_sales: integer
    return_rate: decimal
    response_time_ms: integer
    time_operating_days: integer
    reliability_score: decimal
    status: varchar  // verified, established, new, unknown, blocked
    raw_data: jsonb
    created_at: timestamp
    updated_at: timestamp
}
```

#### SupplierProduct (Listing)
```
SupplierProduct {
    id: UUID
    source_id: FK → Source
    supplier_id: FK → Supplier (nullable)
    source_product_id: varchar  // product ID on the platform
    product_id: FK → Product (nullable)  // matched canonical product
    variant_id: FK → ProductVariant (nullable)
    match_confidence: decimal
    match_type: varchar  // exact, strong, similar, weak, invalid
    title: text
    images: jsonb
    raw_data: jsonb
    last_synced_at: timestamp
    created_at: timestamp
    updated_at: timestamp
}
```

#### PriceRecord
```
PriceRecord {
    id: UUID
    supplier_product_id: FK → SupplierProduct
    price: decimal
    currency: varchar (3 chars)
    shipping_cost: decimal
    shipping_confidence: varchar  // confirmed, estimated, free, unknown
    tax_amount: decimal
    import_duties: decimal
    final_landed_cost: decimal
    exchange_rate: decimal
    exchange_rate_timestamp: timestamp
    in_stock: boolean
    stock_quantity: integer (nullable)
    confidence: varchar  // confirmed, estimated, unknown
    source_url: text
    captured_at: timestamp
}
```

#### DeliveryEstimate
```
DeliveryEstimate {
    id: UUID
    supplier_product_id: FK → SupplierProduct
    min_days: integer (nullable)
    max_days: integer (nullable)
    confidence: varchar  // confirmed, estimated_high, estimated_low, unknown
    ships_from: varchar  // Mexico, China, US, Other, Unknown
    shipping_provider: varchar (nullable)
    free_shipping: boolean
    tracking_available: boolean
    raw_data: jsonb
    captured_at: timestamp
}
```

#### Offer (Calculated)
```
Offer {
    id: UUID
    product_id: FK → Product
    variant_id: FK → ProductVariant (nullable)
    supplier_product_id: FK → SupplierProduct
    our_price: decimal
    our_margin: decimal
    margin_percentage: decimal
    landed_cost: decimal
    ranking_cheapest: integer (nullable)
    ranking_fastest: integer (nullable)
    ranking_best: integer (nullable)
    is_best_offer: boolean
    explanation: jsonb  // price explanation/traceability
    calculated_at: timestamp
}
```

#### PriceExplanation
```
PriceExplanation {
    offer_id: FK → Offer
    timestamp: varchar
    source: varchar
    supplier: varchar
    product: varchar
    variant: varchar
    product_price: decimal
    shipping: decimal
    shipping_confidence: varchar
    tax: decimal
    import_duties: decimal
    fees: decimal
    exchange_rate: decimal
    exchange_rate_source: varchar
    final_cost: decimal
    competitor_price: decimal (nullable)
    competitor_source: varchar (nullable)
    our_price: decimal
    pricing_rule: varchar
    algorithm_version: varchar
    match_confidence: decimal
    match_type: varchar
}
```

#### Order + OrderItem + Payment + Shipment
(Existing schema — keep as-is with minor additions)

### New Entities Needed

| Entity | Purpose | Priority |
|--------|---------|----------|
| DeliveryEstimate | Track delivery per listing | P0 |
| PriceExplanation | Traceability for every price shown | P0 |
| SourceHealthLog | Track source adapter health | P1 |
| MatchAuditLog | Track matching decisions for review | P1 |
| CategoryMapping | Map supplier categories to canonical | P1 |
| ExchangeRateCache | Cache exchange rates | P1 |

---

## 14. Price Explanation / Traceability

### Requirement

Every price shown to a user must be explainable. If a user asks "why $149.99?", we must be able to answer:

### Explanation Fields

```json
{
  "timestamp": "2026-08-29T14:32:00Z",
  "source": "aliexpress",
  "source_url": "https://aliexpress.com/item/1005008039213625.html",
  "supplier": "Shenzhen TechStore Co.",
  "supplier_verified": true,
  "supplier_rating": 4.8,
  "product": "iPhone 15 Silicone Case",
  "variant": "Black / Medium",
  "product_price_usd": 8.50,
  "product_price_mxn": 145.78,
  "shipping_cost_mxn": 45.00,
  "shipping_confidence": "estimated",
  "shipping_source": "AliExpress standard calculator",
  "tax_amount_mxn": 30.53,
  "import_duties_mxn": 0,
  "exchange_rate": 17.15,
  "exchange_rate_source": "Banxico",
  "exchange_rate_timestamp": "2026-08-29T00:00:00Z",
  "final_landed_cost_mxn": 221.31,
  "our_price_mxn": 229.99,
  "our_margin_mxn": 8.68,
  "our_margin_percentage": 3.77,
  "pricing_rule": "minimum_margin",
  "match_confidence": 0.92,
  "match_type": "strong",
  "match_evidence": ["title_85%", "brand_match", "price_range_close"],
  "algorithm_version": "1.0.0"
}
```

### Storage

Each `Offer` row must include a `PriceExplanation` JSONB field. This allows:
- Debugging pricing decisions
- Answering customer questions
- Auditing algorithm behavior
- Identifying systematic errors

---

## 15. Phase 0 — Redefined

### Objective

> **Can we build a product that finds real better deals, legally and operationally?**

### Scope

Phase 0 is NOT "research APIs." Phase 0 is a structured validation of 16 hypotheses.

### Hypotheses

| # | Hypothesis | How to Validate |
|---|------------|-----------------|
| H1 | Users want to check if TikTok Shop prices are the best | Survey + landing page experiment |
| H2 | We can identify products from TikTok URLs | Build parser, test on 100 URLs |
| H3 | We can find matching products on other sources | Test on 100 products |
| H4 | We can get real prices from AliExpress, Amazon, ML | Test adapters on 50 products |
| H5 | Landed cost comparison is meaningful | Compare 50 products with full cost |
| H6 | Delivery data is available from sources | Check API/scraping feasibility |
| H7 | PriceHunt can beat TikTok Shop price ≥20% of the time | Run full experiment on 200 products |
| H8 | When PriceHunt wins, savings are meaningful (≥10%) | Measure average savings |
| H9 | When TikTok wins, we can honestly say so | Test UX for "TikTok is best" result |
| H10 | Supplier reliability data is available | Check platform APIs |
| H11 | Legal/ToS compliance is achievable | Audit each source |
| H12 | Margins are sustainable (≥2% average) | Calculate on 200 products |
| H13 | Categories with highest opportunity can be identified | Classify by category |
| H14 | Matching accuracy ≥90% is achievable | Manual verification |
| H15 | Users will trust PriceHunt even when it says "TikTok wins" | User testing |
| H16 | The product can operate legally in Mexico | Legal review |

### Experiments

#### Experiment 1: TikTok Product Extraction (1 week)
- Collect 100 real TikTok Shop URLs
- Test URL parser + product extraction
- Measure: % success, data completeness

#### Experiment 2: Cross-Source Matching (2 weeks)
- For 100 TikTok products, search across AliExpress, Amazon, ML
- Measure: % matches found, match confidence, manual verification

#### Experiment 3: Full Landed Cost Comparison (2 weeks)
- For 200 products, calculate full landed cost from each source
- Compare with TikTok Shop price + delivery
- Measure: % where PriceHunt wins, average savings

#### Experiment 4: Supplier Reliability (1 week)
- For matched products, evaluate supplier reliability
- Check: verification, ratings, return rates
- Measure: % of matches from reliable suppliers

#### Experiment 5: Legal Audit (1 week)
- Review ToS of each source
- Document: what's allowed, what's not
- Decision: which sources to include/exclude

### Metrics

| Metric | Target | Minimum |
|--------|--------|---------|
| Product extraction success | >80% | >60% |
| Match found | >70% | >50% |
| Match accuracy (manual) | >90% | >80% |
| PriceHunt wins ≥20% cheaper | >30% of products | >20% |
| Average savings when we win | >15% | >10% |
| TikTok wins (honest result) | Reported honestly | — |
| Landed cost calculable | >80% | >60% |
| Delivery data available | >60% | >40% |
| Legal compliance | 100% | 100% |

### Success Criteria

Phase 0 is successful if:
1. We can extract product data from TikTok URLs (>60% success)
2. We can find matches on other sources (>50% of products)
3. When we find matches, they are accurate (>80%)
4. PriceHunt beats TikTok price on ≥20% of products
5. When we win, savings average ≥10%
6. Legal compliance is confirmed for all included sources
7. We can identify which categories have highest opportunity

### Failure Criteria

Phase 0 fails if:
1. Product extraction success <50%
2. Match rate <30%
3. Match accuracy <70%
4. PriceHunt never beats TikTok by >5%
5. Legal blockers for major sources
6. Landed cost comparison is unreliable

### Pivot Conditions

If Phase 0 fails:
- **Low extraction:** Pivot to text/image search instead of URL
- **Low matching:** Narrow to categories with better data (GTIN-rich)
- **No price advantage:** Pivot to "delivery comparison" instead of price
- **Legal issues:** Pivot to only API-authorized sources

---

## 16. MVP Experimental

### Objective

> **Demonstrate that people want to use PriceHunt.**

### What It Is

A single-page web app:
1. Input field for TikTok URL
2. Button: "Find better price"
3. Loading state (3-5 seconds)
4. Result: "We found X% cheaper" OR "TikTok Shop is already the best option"
5. If interested: email capture for launch notification
6. If not: show current price and brief explanation

### What It Is NOT

- No checkout
- No real orders
- No supplier integration
- No payment processing
- No user accounts

### Stack

- Next.js (Vercel)
- Serverless functions (Vercel)
- Supabase (database, free tier)
- OpenAI API (product identification)
- No real supplier connections

### What We Validate

1. Do people paste TikTok URLs?
2. What products do they search for?
3. What percentage want to buy?
4. Where do they come from (traffic source)?
5. What categories are most popular?

### Metrics

| Metric | Target | Timeframe |
|--------|--------|-----------|
| URLs pasted | >100 | 2 weeks |
| Email captures | >30% of users | 2 weeks |
| Return visitors | >20% | 2 weeks |
| Social shares | >10 | 2 weeks |

### Timeline

**2-4 weeks** with 1 developer.

---

## 17. MVP Real

### Objective

> **Enable real transactions. Users can actually buy products through PriceHunt.**

### What It Has

1. Product identification from URL
2. Search across 3+ sources (AliExpress, Amazon, ML)
3. Landed cost calculation
4. Delivery estimation
5. Ranking (Cheapest / Fastest / Best)
6. Price explanation/traceability
7. Checkout with Conekta
8. Order management
9. Supplier purchase (semi-automated)
10. Basic tracking

### What It Doesn't Have

- Image search
- Browser extension
- Native mobile app
- Admin panel (manual DB management)
- Advanced analytics
- Multiple suppliers per order
- Affiliate system
- Referral system

### Stack

- Next.js (Vercel)
- Fastify (Hetzner VPS)
- PostgreSQL (Hetzner VPS)
- Redis (Hetzner VPS)
- BullMQ (Hetzner VPS)
- Meilisearch (Hetzner VPS)
- Conekta (payments)
- Resend (email)

### Timeline

**8-12 weeks** with 1-2 developers.

---

## 18. Validation Experiments

### Main Experiment: TikTok Product Analysis (200 Products)

#### Setup

1. Collect 200 real TikTok Shop products (across 10 categories)
2. For each product:
   - Extract product data (title, price, delivery, images)
   - Search across AliExpress, Amazon, MercadoLibre, eBay
   - Find matches (if any)
   - Calculate landed cost for each match
   - Estimate delivery for each match
   - Evaluate supplier reliability
   - Compare with TikTok Shop

#### Metrics

```
For each product:
  - extraction_success: boolean
  - match_found: boolean
  - match_type: exact | strong | similar | weak | invalid
  - match_confidence: 0.0 - 1.0
  
  For each match:
    - landed_cost: number
    - delivery_days: number
    - delivery_confidence: confirmed | estimated | unknown
    - supplier_score: 0.0 - 1.0
    - savings_vs_tiktok: number (negative = TikTok cheaper)
    - savings_percentage: number

Aggregate:
  - % products with extraction success
  - % products with match found
  - % products with exact/strong match
  - % products where PriceHunt is cheaper
  - % products where PriceHunt is ≥5% cheaper
  - % products where PriceHunt is ≥10% cheaper
  - % products where PriceHunt is ≥20% cheaper
  - Average savings when PriceHunt wins
  - Median savings when PriceHunt wins
  - % products where TikTok is better
  - % products where TikTok wins on delivery
  - % products with known shipping cost
  - % products with known delivery time
  - % matches with high confidence
  - % matches manually verified as correct
```

#### Category Breakdown

For each category, calculate:
- PriceHunt win rate
- Average savings
- Delivery comparison
- Match quality

#### Expected Output

A spreadsheet with:
- 200 rows (one per product)
- Columns for all metrics above
- Summary statistics
- Category breakdown
- Recommendations

---

## 19. Metrics / KPIs

### North Star

**Customer Savings Score (CSS)**
```
CSS = 0.4 * BestOfferRate + 0.3 * AverageSavings + 0.2 * MatchAccuracy + 0.1 * FulfillmentSuccess
```

### Business Metrics

| Metric | Description | Target |
|--------|-------------|--------|
| Best Offer Rate | % of products where we find a better deal | >30% |
| Average Savings | Average % savings when we win | >10% |
| Match Accuracy | % of matches that are correct | >90% |
| Fulfillment Success | % of orders completed successfully | >95% |
| Conversion Rate | % of searches that lead to purchase | >5% |
| Revenue per Search | Average revenue per product search | >$10 MXN |
| Customer Return Rate | % of users who return within 30 days | >20% |

### Technical Metrics

| Metric | Description | Target |
|--------|-------------|--------|
| API Latency (p99) | 99th percentile response time | <500ms |
| Extraction Success Rate | % of URLs successfully parsed | >80% |
| Source Uptime | % of time sources are accessible | >95% |
| Price Freshness | Average age of price data | <24 hours |
| Cache Hit Rate | % of requests served from cache | >70% |
| Worker Queue Depth | Average jobs waiting | <100 |
| Error Rate | % of requests resulting in error | <1% |

### Experiment Metrics

| Metric | Description | Phase 0 Target |
|--------|-------------|----------------|
| PriceHunt Win Rate | % where we beat TikTok | >20% |
| Savings Magnitude | Average savings when we win | >10% |
| TikTok Win Rate | % where TikTok is better | Measured honestly |
| Match Rate | % of products with valid match | >50% |
| Delivery Data Availability | % with known delivery | >60% |

---

## 20. Success Criteria

### Phase 0 Success

- [ ] Product extraction from TikTok URLs: >60% success
- [ ] Cross-source matching: >50% of products matched
- [ ] Match accuracy: >80% (manual verification)
- [ ] PriceHunt beats TikTok: ≥20% of products
- [ ] Average savings when winning: ≥10%
- [ ] Legal compliance confirmed for all sources
- [ ] Category opportunity analysis complete

### MVP Experimental Success

- [ ] 100+ URLs pasted in 2 weeks
- [ ] 30%+ email capture rate
- [ ] 3+ popular categories identified
- [ ] Positive user feedback

### MVP Real Success

- [ ] 100 orders completed
- [ ] 70%+ customer satisfaction
- [ ] Average margin >2%
- [ ] 0 critical errors
- [ ] Fulfillment success >90%

---

## 21. Failure Criteria

### Phase 0 Failure

| Condition | Action |
|-----------|--------|
| Extraction success <50% | Pivot to text/image search |
| Match rate <30% | Narrow to GTIN-rich categories |
| PriceHunt never wins >5% | Pivot to delivery comparison |
| Legal blockers for major sources | Restrict to authorized sources only |
| Landed cost unreliable | Simplify to product price only |

### MVP Failure

| Condition | Action |
|-----------|--------|
| <10 orders in first month | Investigate: product, marketing, pricing |
| Average margin <0% | Adjust pricing strategy |
| Fulfillment success <80% | Review supplier reliability |
| Customer satisfaction <50% | Major UX/product review |

---

## 22. Risk Matrix

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **TikTok Shop blocks URL extraction** | High | High | Use only public data; pivot to text search |
| **AliExpress API changes/restricts** | Medium | High | Multiple sources; cache aggressively |
| **Amazon PA API limitations** | Medium | Medium | scraping fallback (check ToS first) |
| **Match accuracy too low** | Medium | High | Human review for low-confidence; GTIN focus |
| **Margins unsustainable** | High | High | Volume-based revenue; direct supplier deals |
| **Legal action from sources** | Low | Critical | Strict ToS compliance; legal counsel |
| **Price changes between check and purchase** | High | Medium | Pre-purchase verification; absorb small diffs |
| **Supplier doesn't fulfill** | Medium | High | Fallback suppliers; escrow; refund policy |
| **User doesn't trust "TikTok wins" result** | Medium | Medium | Clear explanation; transparent methodology |
| **Exchange rate volatility** | Medium | Medium | Lock rate at checkout; absorb small fluctuations |
| **Delivery estimate wrong** | High | Medium | Conservative estimates; confidence levels |
| **Competitor launches similar product** | Medium | Medium | Speed to market; data moat; UX |

---

## 23. Legal / ToS Considerations

### Access Method Classification

| Method | Description | Risk | Examples |
|--------|-------------|------|----------|
| **Official API** | Authorized API access | Low | AliExpress affiliate, Amazon PA, ML API |
| **Affiliate API** | API through affiliate program | Low | AliExpress via Admitad |
| **Authorized Feed** | Product data feed | Low | Google Shopping feed |
| **Public Data** | Data publicly visible on pages | Medium | Product pages, pricing |
| **Permitted Crawling** | robots.txt allows, ToS permits | Medium | Check per-source |
| **Prohibited Crawling** | ToS prohibits or bot detection | High | Avoid |
| **Ambiguous Access** | Gray area | Medium | Case-by-case review |

### Per-Source Legal Assessment

| Source | Method | ToS Status | Risk | Recommendation |
|--------|--------|------------|------|----------------|
| AliExpress | Affiliate API | ✅ Allowed | Low | Include in MVP |
| Amazon MX | PA API | ✅ Allowed with ToS | Low | Include in MVP |
| MercadoLibre | Public API | ✅ Allowed | Low | Include in MVP |
| eBay | Browse API | ✅ Allowed | Low | Include in MVP |
| Walmart MX | Scraping | ⚠️ Check ToS | Medium | Test first |
| SHEIN | Scraping | ⚠️ Anti-bot | High | Defer |
| Temu | Scraping | ⚠️ Anti-bot | High | Defer |
| TikTok | URL extraction | ⚠️ No official API | Medium | Limited to public data |
| 1688 | No API | ❌ Not accessible | High | Don't include |
| Alibaba | Affiliate | ✅ Allowed | Low | Phase 2 |

### Rules

1. **Never evade bot protection** (CAPTCHAs, IP rotation, user-agent spoofing)
2. **Never access data behind login walls**
3. **Never exceed rate limits**
4. **Always respect robots.txt**
5. **If a source blocks us, stop and reassess**
6. **Legal counsel review before launching each source**

---

## 24. Business Model

### Revenue Models by Phase

#### Phase 1 (MVP): Margin on Transactions

| Model | Description | Viability |
|-------|-------------|-----------|
| **Transaction margin** | 3-5% on each sale | ✅ Primary |
| **Affiliate commissions** | Revenue from affiliate programs | ✅ Secondary |

**Why this works:** We buy from supplier at X, sell to customer at X + margin. Simple, scalable, aligned with user value.

#### Phase 2 (10k users): Hybrid

| Model | Description | Viability |
|-------|-------------|-----------|
| **Transaction margin** | 3-5% | ✅ Primary |
| **Affiliate commissions** | From sources | ✅ Secondary |
| **Supplier commissions** | Suppliers pay for visibility | ⚠️ Careful — don't bias results |

**Caution:** Supplier commissions must NEVER bias the ranking. PriceHunt's trust is more valuable than any commission.

#### Phase 3 (100k+ users): Platform

| Model | Description | Viability |
|-------|-------------|-----------|
| **Transaction margin** | 3-5% | ✅ Primary |
| **Affiliate commissions** | Multiple programs | ✅ Secondary |
| **Premium membership** | Advanced features, alerts | ⚠️ Phase 3 |
| **Supplier deals** | Direct agreements | ⚠️ Phase 4 |

### Revenue Projections

| Phase | Users | Orders/month | Ticket avg | Monthly Revenue |
|-------|-------|--------------|------------|-----------------|
| MVP | 100 | 100 | $500 MXN | $1,500 MXN (~$85 USD) |
| Growth | 10k | 1,000 | $500 MXN | $15,000 MXN (~$850 USD) |
| Scale | 100k | 10,000 | $500 MXN | $150,000 MXN (~$8,500 USD) |
| Platform | 1M | 100,000 | $500 MXN | $1,500,000 MXN (~$85,000 USD) |

*(Assuming 3% average margin)*

---

## 25. Build Now / Build Later / Do Not Build Yet

### BUILD NOW (Phase 0 + MVP)

| Component | Reason |
|-----------|--------|
| TikTok URL parser | Core feature — user entry point |
| Product identification | Core feature — must work |
| Supplier adapters (AliExpress, Amazon, ML) | Core data sources |
| Matching engine (improved) | Core — must find correct matches |
| Landed cost calculator | Core — must show real cost |
| Delivery estimation | Core — TikTok's advantage must be accounted for |
| Price explanation | Core — trust requires transparency |
| Ranking (Cheapest/Fastest/Best) | Core — user decision support |
| Checkout (Conekta) | Core — enable transactions |
| Order management | Core — fulfill orders |
| Basic admin | Needed to operate |
| Email notifications | Transactional emails |

### BUILD LATER (Phase 2: 10k users)

| Component | Reason |
|-----------|--------|
| Image search | Nice-to-have, not needed for validation |
| Advanced analytics | Need data first |
| Admin panel (full) | Manual management works for MVP |
| Supplier health monitoring | Important but can start basic |
| Price alerts | Retention feature |
| User accounts | Guest checkout first |
| Multi-currency display | Can hardcode MXN for Mexico |
| Exchange rate API | Can hardcode for MVP |

### DO NOT BUILD YET

| Component | Reason |
|-----------|--------|
| Browser extension | Not needed for validation |
| Native mobile app | PWA sufficient for MVP |
| Kafka | BullMQ handles queue needs |
| Kubernetes | Single VPS sufficient |
| Microservices | Modular monolith is correct |
| Advanced ML (CLIP, embeddings) | Jaccard + deterministic is sufficient for MVP |
| Image matching | GTIN/title matching works for most products |
| Multi-country | Focus on Mexico |
| Multi-language | Focus on Spanish |
| Affiliate system | Manual initially |
| Referral system | Phase 3+ |
| Fraud detection | Phase 3+ |
| Real-time pricing updates | Hourly/daily sufficient for MVP |
| Supplier auto-negotiation | Phase 5+ |
| Predictive pricing | Phase 5+ |
| White-label | Phase 5+ |
| GraphQL | REST sufficient |
| Elasticsearch | Meilisearch sufficient |
| Redis Sentinel/Cluster | Single Redis sufficient |
| Read replicas | Single DB sufficient |

---

## 26. Revised Roadmap

### Phase 0 — Research & Validation (2-4 weeks)

**Objective:** Validate that PriceHunt can find real better deals legally.

**Deliverables:**
- 200-product experiment completed
- Legal audit complete
- Source viability report
- Category opportunity analysis
- Pivot/continue decision

**Cost:** $0 (using existing infrastructure)
**Team:** 1 person

### Phase 1a — MVP Core (DONE)

**Objective:** Build core matching, pricing, and ingestion.

**Status:** ✅ Nearly complete. Code written, 54 tests passing.

**Remaining:**
- Run workers on VM
- Test end-to-end
- Wire up ingestion worker to API

### Phase 1b — MVP Complete (4-6 weeks)

**Objective:** Full MVP with checkout and orders.

**Features:**
- Delivery estimation model
- Improved matching (MPN, brand, attributes)
- Price explanation
- Ranking (Cheapest/Fastest/Best)
- Checkout with Conekta
- Order management
- Basic admin (manual)
- Email notifications

**Cost:** ~$100/month (Hetzner + Vercel + Conekta)
**Team:** 1-2 people

### Phase 2 — Production (8-12 weeks)

**Objective:** Scale to 10k users.

**Features:**
- 5+ sources active
- Image matching (CLIP)
- Full admin panel
- Advanced analytics
- Price alerts
- User accounts
- Improved matching accuracy

**Cost:** ~$300/month
**Team:** 2-3 people

### Phase 3 — Growth (12-24 weeks)

**Objective:** Scale to 100k users.

**Features:**
- Browser extension
- PWA mobile app
- Affiliate system
- Referral system
- Multi-country (LATAM)
- Advanced ML matching

**Cost:** ~$1,000-2,000/month
**Team:** 3-5 people

### Phase 4 — Platform (24+ weeks)

**Objective:** 1M+ users.

**Features:**
- Direct supplier agreements
- Auto-negotiation
- Predictive pricing
- White-label
- API for partners

**Cost:** ~$5,000-10,000/month
**Team:** 5-10 people

---

## 27. Open Questions

### Product

1. **What percentage of TikTok Shop products have GTINs?** This determines matching strategy.
2. **How do we handle TikTok Shop products that are exclusive (not sold elsewhere)?** We must honestly say "no alternative found."
3. **Should PriceHunt show products that are MORE expensive but faster?** Yes — "Best Overall" ranking.
4. **How do we handle flash sales / temporary discounts?** Track price history, note when price is unusually low.

### Technical

5. **Can we get reliable delivery data from AliExpress API?** Need to test.
6. **How accurate is Amazon's delivery estimation via API?** Need to test.
7. **Do SHEIN/Temu have anti-bot measures that make scraping impossible?** Need to test.
8. **What's the minimum viable matching accuracy?** Probably 80%.

### Business

9. **Should we charge suppliers for visibility?** Only after proving value, never biasing results.
10. **What's the minimum order value for viable margins?** Probably $200+ MXN.
11. **Do we need to handle returns/refunds ourselves?** For MVP, delegate to supplier.

### Legal

12. **Is extracting TikTok product data legal in Mexico?** Need legal review.
13. **Can we use Amazon product images in our results?** Probably with attribution.
14. **Do we need to register as a marketplace with PROFECO?** Probably yes.

---

## 28. Final Recommendation

### Priority Order

1. **Run the 200-product experiment.** This is the single most important thing. Everything else is hypothesis until we have data.

2. **Complete Phase 1a.** Wire up the workers, test end-to-end on VM. The code is written; make it work.

3. **Audit legal/ToS.** Before building anything more, confirm we can legally access each source.

4. **Build the delivery model.** This is the gap that TikTok Shop exploits. Without it, our comparison is incomplete.

5. **Build price explanation.** Trust requires transparency. Every price must be explainable.

6. **Then build checkout.** Only after the comparison engine works and we've validated the thesis.

### What NOT to Do

- Don't build more supplier adapters until we know which sources are viable
- Don't build the frontend until the backend comparison engine works
- Don't scale until we've validated with real users
- Don't add complexity until we need it

### The Experiment Comes First

Before writing another line of code, we need to answer:

> **"On what percentage of real TikTok Shop products can PriceHunt find a genuinely better deal?"**

If the answer is <20%, we pivot. If it's >20%, we build.

---

**Document status:** Restructured planning complete
**Date:** 2026-08-29
**Next step:** Run 200-product experiment
**Decision required:** Proceed with Phase 0 experiment or complete Phase 1a first?
