-- PriceHunt Database Schema
-- PostgreSQL 16

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- USERS & AUTHENTICATION
-- ============================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    phone VARCHAR(20),
    is_verified BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token_hash VARCHAR(255) NOT NULL,
    user_agent TEXT,
    ip_address INET,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    label VARCHAR(50) DEFAULT 'home',
    street VARCHAR(255) NOT NULL,
    street2 VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    postal_code VARCHAR(10) NOT NULL,
    country VARCHAR(3) DEFAULT 'MX',
    phone VARCHAR(20),
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- CATALOG
-- ============================================

CREATE TABLE brands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    logo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_id UUID REFERENCES categories(id),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    level INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- PRODUCTS
-- ============================================

CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    canonical_name TEXT NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    brand_id UUID REFERENCES brands(id),
    category_id UUID REFERENCES categories(id),
    gtin VARCHAR(14),
    mpn VARCHAR(100),
    description TEXT,
    attributes JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE product_variants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    sku VARCHAR(100),
    name VARCHAR(255),
    attributes JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE product_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
    url TEXT NOT NULL,
    alt_text VARCHAR(255),
    width INTEGER,
    height INTEGER,
    file_size INTEGER,
    position INTEGER DEFAULT 0,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- SUPPLIERS
-- ============================================

CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('api', 'feed', 'scraping', 'direct')),
    base_url TEXT,
    api_key_encrypted TEXT,
    config JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    reliability_score DECIMAL(3,2) DEFAULT 0.50,
    success_rate DECIMAL(5,4) DEFAULT 0.9500,
    avg_response_time_ms INTEGER DEFAULT 1000,
    return_rate DECIMAL(5,4) DEFAULT 0.0500,
    last_health_check TIMESTAMP WITH TIME ZONE,
    health_status VARCHAR(20) DEFAULT 'healthy' CHECK (health_status IN ('healthy', 'degraded', 'down')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE supplier_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    supplier_product_id VARCHAR(255) NOT NULL,
    product_id UUID REFERENCES products(id),
    variant_id UUID REFERENCES product_variants(id),
    match_confidence DECIMAL(3,2) DEFAULT 0.50,
    match_type VARCHAR(20) DEFAULT 'unknown' CHECK (match_type IN ('exact', 'variant', 'equivalent', 'similar', 'unknown')),
    raw_data JSONB,
    last_synced_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(supplier_id, supplier_product_id)
);

-- ============================================
-- PRICING
-- ============================================

CREATE TABLE current_prices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_product_id UUID UNIQUE NOT NULL REFERENCES supplier_products(id) ON DELETE CASCADE,
    price DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    shipping_cost DECIMAL(12,2) DEFAULT 0,
    tax_amount DECIMAL(12,2) DEFAULT 0,
    final_price DECIMAL(12,2) NOT NULL,
    in_stock BOOLEAN DEFAULT true,
    stock_quantity INTEGER,
    delivery_days_min INTEGER,
    delivery_days_max INTEGER,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT positive_price CHECK (price >= 0),
    CONSTRAINT positive_final_price CHECK (final_price >= 0)
);

CREATE TABLE price_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_product_id UUID NOT NULL REFERENCES supplier_products(id) ON DELETE CASCADE,
    price DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    shipping_cost DECIMAL(12,2),
    tax_amount DECIMAL(12,2),
    final_price DECIMAL(12,2),
    in_stock BOOLEAN DEFAULT true,
    stock_quantity INTEGER,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
) PARTITION BY RANGE (timestamp);

-- Create monthly partitions
CREATE TABLE price_events_2024_01 PARTITION OF price_events
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
CREATE TABLE price_events_2024_02 PARTITION OF price_events
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');
-- Add more partitions as needed

CREATE TABLE pricing_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL CHECK (type IN ('percentage', 'fixed', 'dynamic', 'competitor')),
    config JSONB NOT NULL DEFAULT '{}',
    priority INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    valid_from TIMESTAMP WITH TIME ZONE,
    valid_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE exchange_rates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_currency VARCHAR(3) NOT NULL,
    to_currency VARCHAR(3) NOT NULL,
    rate DECIMAL(12,6) NOT NULL,
    source VARCHAR(50),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(from_currency, to_currency, timestamp)
);

-- ============================================
-- OFFERS
-- ============================================

CREATE TABLE offers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
    supplier_product_id UUID NOT NULL REFERENCES supplier_products(id) ON DELETE CASCADE,
    our_price DECIMAL(12,2) NOT NULL,
    our_margin DECIMAL(12,2) NOT NULL,
    margin_percentage DECIMAL(5,2) NOT NULL,
    score DECIMAL(3,2) NOT NULL,
    price_score DECIMAL(3,2),
    delivery_score DECIMAL(3,2),
    reliability_score DECIMAL(3,2),
    match_score DECIMAL(3,2),
    is_best_offer BOOLEAN DEFAULT false,
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT positive_our_price CHECK (our_price >= 0)
);

CREATE TABLE price_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
    supplier_price DECIMAL(12,2),
    shipping_cost DECIMAL(12,2),
    tax_amount DECIMAL(12,2),
    total_landed_cost DECIMAL(12,2),
    our_price DECIMAL(12,2),
    margin DECIMAL(12,2),
    competitor_price DECIMAL(12,2),
    pricing_rule_id UUID,
    algorithm_version VARCHAR(20),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- ORDERS
-- ============================================

CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN (
        'pending', 'pending_payment', 'confirmed', 'processing',
        'shipped', 'delivered', 'completed', 'cancelled', 'refunded'
    )),
    subtotal DECIMAL(12,2) NOT NULL,
    shipping_cost DECIMAL(12,2) DEFAULT 0,
    tax_amount DECIMAL(12,2) DEFAULT 0,
    discount_amount DECIMAL(12,2) DEFAULT 0,
    total DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'MXN',
    shipping_address_id UUID REFERENCES addresses(id),
    billing_address JSONB,
    payment_method VARCHAR(50),
    payment_id VARCHAR(255),
    notes TEXT,
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    variant_id UUID REFERENCES product_variants(id),
    supplier_product_id UUID NOT NULL REFERENCES supplier_products(id),
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(12,2) NOT NULL,
    total_price DECIMAL(12,2) NOT NULL,
    price_snapshot JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT positive_quantity CHECK (quantity > 0),
    CONSTRAINT positive_unit_price CHECK (unit_price >= 0)
);

-- ============================================
-- SUPPLIER ORDERS
-- ============================================

CREATE TABLE supplier_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES suppliers(id),
    supplier_order_id VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN (
        'pending', 'confirmed', 'processing', 'shipped',
        'delivered', 'cancelled', 'failed'
    )),
    total_cost DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    tracking_number VARCHAR(255),
    estimated_delivery TIMESTAMP WITH TIME ZONE,
    actual_delivery TIMESTAMP WITH TIME ZONE,
    raw_response JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- PAYMENTS
-- ============================================

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    provider_payment_id VARCHAR(255),
    amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN (
        'pending', 'authorized', 'captured', 'failed', 'refunded'
    )),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE refunds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    payment_id UUID NOT NULL REFERENCES payments(id),
    amount DECIMAL(12,2) NOT NULL,
    reason TEXT,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN (
        'pending', 'processing', 'completed', 'failed'
    )),
    provider_refund_id VARCHAR(255),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- SHIPPING
-- ============================================

CREATE TABLE shipments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    supplier_order_id UUID REFERENCES supplier_orders(id),
    carrier VARCHAR(100),
    service VARCHAR(100),
    tracking_number VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN (
        'pending', 'label_created', 'in_transit', 'out_for_delivery',
        'delivered', 'exception', 'returned'
    )),
    estimated_delivery TIMESTAMP WITH TIME ZONE,
    actual_delivery TIMESTAMP WITH TIME ZONE,
    weight DECIMAL(8,2),
    dimensions JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE tracking_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shipment_id UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
    status VARCHAR(100) NOT NULL,
    location VARCHAR(255),
    description TEXT,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    raw_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- AUDIT & LOGS
-- ============================================

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL,
    user_id UUID REFERENCES users(id),
    changes JSONB,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
) PARTITION BY RANGE (timestamp);

CREATE TABLE error_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service VARCHAR(100) NOT NULL,
    error_type VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    stack_trace TEXT,
    context JSONB,
    severity VARCHAR(20) DEFAULT 'error' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
    resolved BOOLEAN DEFAULT false,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

-- Users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at);

-- Addresses
CREATE INDEX idx_addresses_user ON addresses(user_id);
CREATE INDEX idx_addresses_postal ON addresses(postal_code);

-- Products
CREATE INDEX idx_products_brand ON products(brand_id);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_gtin ON products(gtin);
CREATE INDEX idx_products_mpn ON products(mpn);
CREATE INDEX idx_products_name_search ON products USING gin(canonical_name gin_trgm_ops);
CREATE INDEX idx_products_attributes ON products USING gin(attributes);
CREATE INDEX idx_products_active ON products(is_active) WHERE is_active = true;

-- Product Variants
CREATE INDEX idx_variants_product ON product_variants(product_id);
CREATE INDEX idx_variants_sku ON product_variants(sku);
CREATE INDEX idx_variants_attributes ON product_variants USING gin(attributes);

-- Product Images
CREATE INDEX idx_images_product ON product_images(product_id);
CREATE INDEX idx_images_variant ON product_images(variant_id);

-- Suppliers
CREATE INDEX idx_suppliers_active ON suppliers(is_active) WHERE is_active = true;
CREATE INDEX idx_suppliers_health ON suppliers(health_status);

-- Supplier Products
CREATE INDEX idx_supplier_products_supplier ON supplier_products(supplier_id);
CREATE INDEX idx_supplier_products_product ON supplier_products(product_id);
CREATE INDEX idx_supplier_products_variant ON supplier_products(variant_id);
CREATE INDEX idx_supplier_products_match ON supplier_products(match_confidence);
CREATE INDEX idx_supplier_products_sync ON supplier_products(last_synced_at);

-- Current Prices
CREATE INDEX idx_prices_supplier_product ON current_prices(supplier_product_id);
CREATE INDEX idx_prices_stock ON current_prices(in_stock) WHERE in_stock = true;
CREATE INDEX idx_prices_final ON current_prices(final_price);

-- Price Events
CREATE INDEX idx_price_events_supplier ON price_events(supplier_product_id);
CREATE INDEX idx_price_events_timestamp ON price_events(timestamp);

-- Offers
CREATE INDEX idx_offers_product ON offers(product_id);
CREATE INDEX idx_offers_variant ON offers(variant_id);
CREATE INDEX idx_offers_supplier ON offers(supplier_product_id);
CREATE INDEX idx_offers_best ON offers(is_best_offer) WHERE is_best_offer = true;
CREATE INDEX idx_offers_score ON offers(score DESC);

-- Price Snapshots
CREATE INDEX idx_snapshots_offer ON price_snapshots(offer_id);
CREATE INDEX idx_snapshots_timestamp ON price_snapshots(timestamp);

-- Orders
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at);
CREATE INDEX idx_orders_number ON orders(order_number);

-- Order Items
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_product ON order_items(product_id);

-- Supplier Orders
CREATE INDEX idx_supplier_orders_order ON supplier_orders(order_id);
CREATE INDEX idx_supplier_orders_supplier ON supplier_orders(supplier_id);
CREATE INDEX idx_supplier_orders_status ON supplier_orders(status);

-- Payments
CREATE INDEX idx_payments_order ON payments(order_id);
CREATE INDEX idx_payments_status ON payments(status);

-- Refunds
CREATE INDEX idx_refunds_order ON refunds(order_id);
CREATE INDEX idx_refunds_payment ON refunds(payment_id);

-- Shipments
CREATE INDEX idx_shipments_order ON shipments(order_id);
CREATE INDEX idx_shipments_tracking ON shipments(tracking_number);
CREATE INDEX idx_shipments_status ON shipments(status);

-- Tracking Events
CREATE INDEX idx_tracking_shipment ON tracking_events(shipment_id);
CREATE INDEX idx_tracking_timestamp ON tracking_events(timestamp);

-- Audit Logs
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_timestamp ON audit_logs(timestamp);

-- Error Logs
CREATE INDEX idx_error_service ON error_logs(service);
CREATE INDEX idx_error_severity ON error_logs(severity);
CREATE INDEX idx_error_timestamp ON error_logs(timestamp);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to all tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_addresses_updated_at BEFORE UPDATE ON addresses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_product_variants_updated_at BEFORE UPDATE ON product_variants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_supplier_products_updated_at BEFORE UPDATE ON supplier_products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pricing_rules_updated_at BEFORE UPDATE ON pricing_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_supplier_orders_updated_at BEFORE UPDATE ON supplier_orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_refunds_updated_at BEFORE UPDATE ON refunds
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shipments_updated_at BEFORE UPDATE ON shipments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Generate order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.order_number = 'PH-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
                       LPAD(CAST(nextval('order_number_seq') AS TEXT), 6, '0');
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE SEQUENCE order_number_seq START 1;

CREATE TRIGGER set_order_number BEFORE INSERT ON orders
    FOR EACH ROW EXECUTE FUNCTION generate_order_number();

-- ============================================
-- VIEWS
-- ============================================

-- Active products with best offers
CREATE VIEW v_products_with_offers AS
SELECT 
    p.id,
    p.canonical_name,
    p.slug,
    b.name as brand_name,
    o.our_price,
    o.score as offer_score,
    o.is_best_offer
FROM products p
LEFT JOIN brands b ON p.brand_id = b.id
LEFT JOIN offers o ON p.id = o.product_id AND o.is_best_offer = true
WHERE p.is_active = true;

-- Supplier health dashboard
CREATE VIEW v_supplier_health AS
SELECT 
    s.id,
    s.name,
    s.health_status,
    s.reliability_score,
    s.success_rate,
    s.avg_response_time_ms,
    COUNT(sp.id) as total_products,
    COUNT(CASE WHEN cp.in_stock = true THEN 1 END) as in_stock_products,
    s.last_health_check
FROM suppliers s
LEFT JOIN supplier_products sp ON s.id = sp.supplier_id
LEFT JOIN current_prices cp ON sp.id = cp.supplier_product_id
WHERE s.is_active = true
GROUP BY s.id;

-- Daily order summary
CREATE VIEW v_daily_orders AS
SELECT 
    DATE(created_at) as date,
    COUNT(*) as total_orders,
    SUM(total) as total_revenue,
    AVG(total) as avg_order_value,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_orders,
    COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_orders
FROM orders
GROUP BY DATE(created_at)
ORDER BY date DESC;
