# Entity Relationship Diagrams - PriceHunt

## Diagrama Principal de Entidades

```mermaid
erDiagram
    USERS {
        uuid id PK
        varchar email UK
        varchar password_hash
        varchar name
        varchar phone
        timestamp created_at
        timestamp updated_at
    }

    ADDRESSES {
        uuid id PK
        uuid user_id FK
        varchar street
        varchar city
        varchar state
        varchar postal_code
        varchar country
        boolean is_default
    }

    BRANDS {
        uuid id PK
        varchar name
        varchar slug UK
        timestamp created_at
    }

    CATEGORIES {
        uuid id PK
        uuid parent_id FK
        varchar name
        varchar slug UK
        integer level
    }

    PRODUCTS {
        uuid id PK
        text canonical_name
        varchar slug UK
        uuid brand_id FK
        uuid category_id FK
        varchar gtin
        varchar mpn
        text description
        jsonb attributes
        timestamp created_at
        timestamp updated_at
    }

    PRODUCT_VARIANTS {
        uuid id PK
        uuid product_id FK
        varchar sku
        varchar name
        jsonb attributes
        timestamp created_at
    }

    PRODUCT_IMAGES {
        uuid id PK
        uuid product_id FK
        uuid variant_id FK
        text url
        varchar alt_text
        integer position
        boolean is_primary
    }

    SUPPLIERS {
        uuid id PK
        varchar name
        varchar slug UK
        varchar type
        text base_url
        text api_key_encrypted
        jsonb config
        boolean is_active
        decimal reliability_score
        timestamp created_at
    }

    SUPPLIER_PRODUCTS {
        uuid id PK
        uuid supplier_id FK
        varchar supplier_product_id
        uuid product_id FK
        uuid variant_id FK
        decimal match_confidence
        jsonb raw_data
        timestamp created_at
        timestamp updated_at
    }

    CURRENT_PRICES {
        uuid id PK
        uuid supplier_product_id FK
        decimal price
        varchar currency
        decimal shipping_cost
        decimal tax_amount
        decimal final_price
        boolean in_stock
        timestamp last_updated
    }

    PRICE_EVENTS {
        uuid id PK
        uuid supplier_product_id FK
        decimal price
        varchar currency
        decimal shipping_cost
        decimal tax_amount
        decimal final_price
        boolean in_stock
        timestamp timestamp
    }

    OFFERS {
        uuid id PK
        uuid product_id FK
        uuid variant_id FK
        uuid supplier_product_id FK
        decimal our_price
        decimal our_margin
        decimal margin_percentage
        decimal score
        boolean is_best_offer
        timestamp calculated_at
    }

    USERS ||--o{ ADDRESSES : has
    BRANDS ||--o{ PRODUCTS : "brands"
    CATEGORIES ||--o{ PRODUCTS : "categorizes"
    PRODUCTS ||--o{ PRODUCT_VARIANTS : has
    PRODUCTS ||--o{ PRODUCT_IMAGES : has
    PRODUCT_VARIANTS ||--o{ PRODUCT_IMAGES : has
    SUPPLIERS ||--o{ SUPPLIER_PRODUCTS : lists
    PRODUCTS ||--o{ SUPPLIER_PRODUCTS : "referenced by"
    PRODUCT_VARIANTS ||--o{ SUPPLIER_PRODUCTS : "referenced by"
    SUPPLIER_PRODUCTS ||--o| CURRENT_PRICES : "has price"
    SUPPLIER_PRODUCTS ||--o{ PRICE_EVENTS : "price history"
    PRODUCTS ||--o{ OFFERS : "has offers"
    PRODUCT_VARIANTS ||--o{ OFFERS : "has offers"
    SUPPLIER_PRODUCTS ||--o{ OFFERS : "referenced in"
```

## Diagrama de Órdenes

```mermaid
erDiagram
    ORDERS {
        uuid id PK
        uuid user_id FK
        varchar status
        decimal total
        varchar currency
        uuid shipping_address_id FK
        varchar payment_method
        varchar payment_id
        text notes
        timestamp created_at
        timestamp updated_at
    }

    ORDER_ITEMS {
        uuid id PK
        uuid order_id FK
        uuid product_id FK
        uuid variant_id FK
        uuid supplier_product_id FK
        integer quantity
        decimal unit_price
        decimal total_price
        jsonb price_snapshot
    }

    SUPPLIER_ORDERS {
        uuid id PK
        uuid order_id FK
        uuid supplier_id FK
        varchar supplier_order_id
        varchar status
        decimal total_cost
        varchar tracking_number
        timestamp created_at
        timestamp updated_at
    }

    PAYMENTS {
        uuid id PK
        uuid order_id FK
        varchar provider
        varchar provider_payment_id
        decimal amount
        varchar currency
        varchar status
        jsonb metadata
        timestamp created_at
    }

    REFUNDS {
        uuid id PK
        uuid order_id FK
        uuid payment_id FK
        decimal amount
        varchar reason
        varchar status
        timestamp created_at
    }

    SHIPMENTS {
        uuid id PK
        uuid order_id FK
        uuid supplier_order_id FK
        varchar carrier
        varchar service
        varchar tracking_number
        varchar status
        timestamp estimated_delivery
        timestamp actual_delivery
        timestamp created_at
    }

    TRACKING_EVENTS {
        uuid id PK
        uuid shipment_id FK
        varchar status
        varchar location
        timestamp timestamp
        jsonb raw_data
    }

    USERS ||--o{ ORDERS : places
    ADDRESSES ||--o| ORDERS : "ships to"
    ORDERS ||--o{ ORDER_ITEMS : contains
    ORDERS ||--o{ SUPPLIER_ORDERS : generates
    ORDERS ||--o{ PAYMENTS : has
    ORDERS ||--o{ REFUNDS : may_have
    ORDERS ||--o| SHIPMENTS : has
    PAYMENTS ||--o{ REFUNDS : may_have
    SUPPLIER_ORDERS ||--o| SHIPMENTS : tracks
    SHIPMENTS ||--o{ TRACKING_EVENTS : has
```

## Diagrama de Pricing y Reglas

```mermaid
erDiagram
    PRICING_RULES {
        uuid id PK
        varchar name
        varchar type
        jsonb config
        integer priority
        boolean is_active
        timestamp created_at
    }

    PRICE_SNAPSHOTS {
        uuid id PK
        uuid offer_id FK
        decimal supplier_price
        decimal shipping_cost
        decimal tax_amount
        decimal total_landed_cost
        decimal our_price
        decimal margin
        timestamp timestamp
    }

    COMMISSIONS {
        uuid id PK
        uuid supplier_id FK
        decimal percentage
        decimal fixed_amount
        varchar type
        timestamp valid_from
        timestamp valid_until
    }

    EXCHANGE_RATES {
        uuid id PK
        varchar from_currency
        varchar to_currency
        decimal rate
        timestamp timestamp
        varchar source
    }

    OFFERS ||--o{ PRICE_SNAPSHOTS : "snapshots"
    SUPPLIERS ||--o{ COMMISSIONS : "has commissions"
```

## Diagrama de Auditoría y Logs

```mermaid
erDiagram
    AUDIT_LOGS {
        uuid id PK
        varchar entity_type
        uuid entity_id
        varchar action
        uuid user_id FK
        jsonb changes
        inet ip_address
        timestamp timestamp
    }

    WEBHOOK_EVENTS {
        uuid id PK
        varchar event_type
        jsonb payload
        varchar status
        integer retry_count
        timestamp created_at
        timestamp processed_at
    }

    ERROR_LOGS {
        uuid id PK
        varchar service
        varchar error_type
        text message
        jsonb context
        varchar severity
        timestamp timestamp
    }

    USERS ||--o{ AUDIT_LOGS : "generates"
```

## Diagrama de Cache y Sesiones

```mermaid
erDiagram
    CACHE_ENTRIES {
        varchar key PK
        text value
        integer ttl_seconds
        timestamp created_at
        timestamp expires_at
    }

    SEARCH_CACHE {
        varchar query_hash PK
        jsonb results
        integer result_count
        timestamp created_at
        timestamp expires_at
    }

    PRODUCT_CACHE {
        uuid product_id PK
        jsonb data
        timestamp cached_at
        timestamp expires_at
    }
```

## Resumen de Relaciones

| Relación | Tipo | Descripción |
|----------|------|-------------|
| Users → Addresses | 1:N | Un usuario tiene muchas direcciones |
| Brands → Products | 1:N | Una marca tiene muchos productos |
| Categories → Products | 1:N | Una categoría tiene muchos productos |
| Products → Variants | 1:N | Un producto tiene muchas variantes |
| Products → Images | 1:N | Un producto tiene muchas imágenes |
| Suppliers → SupplierProducts | 1:N | Un proveedor lista muchos productos |
| Products → SupplierProducts | 1:N | Un producto aparece en muchos proveedores |
| SupplierProducts → CurrentPrices | 1:1 | Cada listing tiene un precio actual |
| SupplierProducts → PriceEvents | 1:N | Historial de precios |
| Products → Offers | 1:N | Ofertas calculadas |
| Orders → OrderItems | 1:N | Una orden tiene muchos items |
| Orders → SupplierOrders | 1:N | Una orden genera órdenes a proveedores |
| Orders → Payments | 1:N | Pagos de una orden |
| Orders → Shipments | 1:1 | Envío de una orden |
| Shipments → TrackingEvents | 1:N | Eventos de tracking |
