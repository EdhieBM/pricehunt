import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  decimal,
  integer,
  jsonb,
  inet,
  unique,
  index,
  pgView,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ============================================
// USERS & AUTHENTICATION
// ============================================

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }),
  phone: varchar('phone', { length: 20 }),
  isVerified: boolean('is_verified').default(false),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  addresses: many(addresses),
  orders: many(orders),
}));

export const userSessions = pgTable('user_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  refreshTokenHash: varchar('refresh_token_hash', { length: 255 }).notNull(),
  userAgent: text('user_agent'),
  ipAddress: inet('ip_address'),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const addresses = pgTable(
  'addresses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    label: varchar('label', { length: 50 }).default('home'),
    street: varchar('street', { length: 255 }).notNull(),
    street2: varchar('street2', { length: 255 }),
    city: varchar('city', { length: 100 }).notNull(),
    state: varchar('state', { length: 100 }).notNull(),
    postalCode: varchar('postal_code', { length: 10 }).notNull(),
    country: varchar('country', { length: 3 }).default('MX'),
    phone: varchar('phone', { length: 20 }),
    isDefault: boolean('is_default').default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    userIdx: index('idx_addresses_user').on(table.userId),
    postalIdx: index('idx_addresses_postal').on(table.postalCode),
  }),
);

export const addressesRelations = relations(addresses, ({ one }) => ({
  user: one(users, { fields: [addresses.userId], references: [users.id] }),
}));

// ============================================
// CATALOG
// ============================================

export const brands = pgTable('brands', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).unique().notNull(),
  logoUrl: text('logo_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const brandsRelations = relations(brands, ({ many }) => ({
  products: many(products),
}));

export const categories = pgTable(
  'categories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    parentId: uuid('parent_id').references((): any => categories.id),
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).unique().notNull(),
    level: integer('level').default(0),
    sortOrder: integer('sort_order').default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    parentIdx: index('idx_categories_parent').on(table.parentId),
  }),
);

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
    relationName: 'categoryTree',
  }),
  products: many(products),
}));

// ============================================
// PRODUCTS
// ============================================

export const products = pgTable(
  'products',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    canonicalName: text('canonical_name').notNull(),
    slug: varchar('slug', { length: 255 }).unique().notNull(),
    brandId: uuid('brand_id').references(() => brands.id),
    categoryId: uuid('category_id').references(() => categories.id),
    gtin: varchar('gtin', { length: 14 }),
    mpn: varchar('mpn', { length: 100 }),
    description: text('description'),
    attributes: jsonb('attributes').default({}),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    brandIdx: index('idx_products_brand').on(table.brandId),
    categoryIdx: index('idx_products_category').on(table.categoryId),
    gtinIdx: index('idx_products_gtin').on(table.gtin),
    mpnIdx: index('idx_products_mpn').on(table.mpn),
    activeIdx: index('idx_products_active').on(table.isActive),
  }),
);

export const productsRelations = relations(products, ({ one, many }) => ({
  brand: one(brands, { fields: [products.brandId], references: [brands.id] }),
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  variants: many(productVariants),
  images: many(productImages),
  supplierProducts: many(supplierProducts),
  offers: many(offers),
}));

export const productVariants = pgTable(
  'product_variants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    sku: varchar('sku', { length: 100 }),
    name: varchar('name', { length: 255 }),
    attributes: jsonb('attributes').default({}),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    productIdx: index('idx_variants_product').on(table.productId),
    skuIdx: index('idx_variants_sku').on(table.sku),
  }),
);

export const productVariantsRelations = relations(productVariants, ({ one, many }) => ({
  product: one(products, {
    fields: [productVariants.productId],
    references: [products.id],
  }),
  images: many(productImages),
  supplierProducts: many(supplierProducts),
}));

export const productImages = pgTable(
  'product_images',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    variantId: uuid('variant_id').references(() => productVariants.id, {
      onDelete: 'set null',
    }),
    url: text('url').notNull(),
    altText: varchar('alt_text', { length: 255 }),
    width: integer('width'),
    height: integer('height'),
    fileSize: integer('file_size'),
    position: integer('position').default(0),
    isPrimary: boolean('is_primary').default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    productIdx: index('idx_images_product').on(table.productId),
    variantIdx: index('idx_images_variant').on(table.variantId),
  }),
);

export const productImagesRelations = relations(productImages, ({ one }) => ({
  product: one(products, {
    fields: [productImages.productId],
    references: [products.id],
  }),
  variant: one(productVariants, {
    fields: [productImages.variantId],
    references: [productVariants.id],
  }),
}));

// ============================================
// SUPPLIERS
// ============================================

export const suppliers = pgTable(
  'suppliers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).unique().notNull(),
    type: varchar('type', { length: 50 }).notNull(),
    baseUrl: text('base_url'),
    apiKeyEncrypted: text('api_key_encrypted'),
    config: jsonb('config').default({}),
    isActive: boolean('is_active').default(true),
    reliabilityScore: decimal('reliability_score', { precision: 3, scale: 2 }).default('0.50'),
    successRate: decimal('success_rate', { precision: 5, scale: 4 }).default('0.9500'),
    avgResponseTimeMs: integer('avg_response_time_ms').default(1000),
    returnRate: decimal('return_rate', { precision: 5, scale: 4 }).default('0.0500'),
    lastHealthCheck: timestamp('last_health_check', { withTimezone: true }),
    healthStatus: varchar('health_status', { length: 20 }).default('healthy'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    activeIdx: index('idx_suppliers_active').on(table.isActive),
    healthIdx: index('idx_suppliers_health').on(table.healthStatus),
  }),
);

export const suppliersRelations = relations(suppliers, ({ many }) => ({
  supplierProducts: many(supplierProducts),
}));

export const supplierProducts = pgTable(
  'supplier_products',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    supplierId: uuid('supplier_id')
      .notNull()
      .references(() => suppliers.id, { onDelete: 'cascade' }),
    supplierProductId: varchar('supplier_product_id', { length: 255 }).notNull(),
    productId: uuid('product_id').references(() => products.id),
    variantId: uuid('variant_id').references(() => productVariants.id),
    matchConfidence: decimal('match_confidence', { precision: 3, scale: 2 }).default('0.50'),
    matchType: varchar('match_type', { length: 20 }).default('unknown'),
    rawData: jsonb('raw_data'),
    lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    supplierIdx: index('idx_supplier_products_supplier').on(table.supplierId),
    productIdx: index('idx_supplier_products_product').on(table.productId),
    variantIdx: index('idx_supplier_products_variant').on(table.variantId),
    matchIdx: index('idx_supplier_products_match').on(table.matchConfidence),
    syncIdx: index('idx_supplier_products_sync').on(table.lastSyncedAt),
    uniqueSupplierProduct: unique('unique_supplier_product').on(
      table.supplierId,
      table.supplierProductId,
    ),
  }),
);

export const supplierProductsRelations = relations(supplierProducts, ({ one, many }) => ({
  supplier: one(suppliers, {
    fields: [supplierProducts.supplierId],
    references: [suppliers.id],
  }),
  product: one(products, {
    fields: [supplierProducts.productId],
    references: [products.id],
  }),
  variant: one(productVariants, {
    fields: [supplierProducts.variantId],
    references: [productVariants.id],
  }),
  currentPrice: many(currentPrices),
  priceEvents: many(priceEvents),
  offers: many(offers),
}));

// ============================================
// PRICING
// ============================================

export const currentPrices = pgTable(
  'current_prices',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    supplierProductId: uuid('supplier_product_id')
      .unique()
      .notNull()
      .references(() => supplierProducts.id, { onDelete: 'cascade' }),
    price: decimal('price', { precision: 12, scale: 2 }).notNull(),
    currency: varchar('currency', { length: 3 }).default('USD'),
    shippingCost: decimal('shipping_cost', { precision: 12, scale: 2 }).default('0'),
    taxAmount: decimal('tax_amount', { precision: 12, scale: 2 }).default('0'),
    finalPrice: decimal('final_price', { precision: 12, scale: 2 }).notNull(),
    inStock: boolean('in_stock').default(true),
    stockQuantity: integer('stock_quantity'),
    deliveryDaysMin: integer('delivery_days_min'),
    deliveryDaysMax: integer('delivery_days_max'),
    lastUpdated: timestamp('last_updated', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    supplierProductIdx: index('idx_prices_supplier_product').on(table.supplierProductId),
    stockIdx: index('idx_prices_stock').on(table.inStock),
    finalIdx: index('idx_prices_final').on(table.finalPrice),
  }),
);

export const currentPricesRelations = relations(currentPrices, ({ one }) => ({
  supplierProduct: one(supplierProducts, {
    fields: [currentPrices.supplierProductId],
    references: [supplierProducts.id],
  }),
}));

export const priceEvents = pgTable(
  'price_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    supplierProductId: uuid('supplier_product_id')
      .notNull()
      .references(() => supplierProducts.id, { onDelete: 'cascade' }),
    price: decimal('price', { precision: 12, scale: 2 }).notNull(),
    currency: varchar('currency', { length: 3 }).default('USD'),
    shippingCost: decimal('shipping_cost', { precision: 12, scale: 2 }),
    taxAmount: decimal('tax_amount', { precision: 12, scale: 2 }),
    finalPrice: decimal('final_price', { precision: 12, scale: 2 }),
    inStock: boolean('in_stock').default(true),
    stockQuantity: integer('stock_quantity'),
    timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    supplierIdx: index('idx_price_events_supplier').on(table.supplierProductId),
    timestampIdx: index('idx_price_events_timestamp').on(table.timestamp),
  }),
);

export const priceEventsRelations = relations(priceEvents, ({ one }) => ({
  supplierProduct: one(supplierProducts, {
    fields: [priceEvents.supplierProductId],
    references: [supplierProducts.id],
  }),
}));

export const pricingRules = pgTable(
  'pricing_rules',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    type: varchar('type', { length: 50 }).notNull(),
    config: jsonb('config').default({}),
    priority: integer('priority').default(0),
    isActive: boolean('is_active').default(true),
    validFrom: timestamp('valid_from', { withTimezone: true }),
    validUntil: timestamp('valid_until', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    activeIdx: index('idx_pricing_rules_active').on(table.isActive),
  }),
);

export const exchangeRates = pgTable(
  'exchange_rates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    fromCurrency: varchar('from_currency', { length: 3 }).notNull(),
    toCurrency: varchar('to_currency', { length: 3 }).notNull(),
    rate: decimal('rate', { precision: 12, scale: 6 }).notNull(),
    source: varchar('source', { length: 50 }),
    timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    uniqueRate: unique('unique_exchange_rate').on(
      table.fromCurrency,
      table.toCurrency,
      table.timestamp,
    ),
  }),
);

// ============================================
// OFFERS
// ============================================

export const offers = pgTable(
  'offers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    variantId: uuid('variant_id').references(() => productVariants.id, {
      onDelete: 'set null',
    }),
    supplierProductId: uuid('supplier_product_id')
      .notNull()
      .references(() => supplierProducts.id, { onDelete: 'cascade' }),
    ourPrice: decimal('our_price', { precision: 12, scale: 2 }).notNull(),
    ourMargin: decimal('our_margin', { precision: 12, scale: 2 }).notNull(),
    marginPercentage: decimal('margin_percentage', { precision: 5, scale: 2 }).notNull(),
    score: decimal('score', { precision: 3, scale: 2 }).notNull(),
    priceScore: decimal('price_score', { precision: 3, scale: 2 }),
    deliveryScore: decimal('delivery_score', { precision: 3, scale: 2 }),
    reliabilityScore: decimal('reliability_score', { precision: 3, scale: 2 }),
    matchScore: decimal('match_score', { precision: 3, scale: 2 }),
    isBestOffer: boolean('is_best_offer').default(false),
    calculatedAt: timestamp('calculated_at', { withTimezone: true }).defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
  },
  (table) => ({
    productIdx: index('idx_offers_product').on(table.productId),
    variantIdx: index('idx_offers_variant').on(table.variantId),
    supplierIdx: index('idx_offers_supplier').on(table.supplierProductId),
    bestIdx: index('idx_offers_best').on(table.isBestOffer),
    scoreIdx: index('idx_offers_score').on(table.score),
  }),
);

export const offersRelations = relations(offers, ({ one }) => ({
  product: one(products, { fields: [offers.productId], references: [products.id] }),
  variant: one(productVariants, {
    fields: [offers.variantId],
    references: [productVariants.id],
  }),
  supplierProduct: one(supplierProducts, {
    fields: [offers.supplierProductId],
    references: [supplierProducts.id],
  }),
}));

export const priceSnapshots = pgTable(
  'price_snapshots',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    offerId: uuid('offer_id')
      .notNull()
      .references(() => offers.id, { onDelete: 'cascade' }),
    supplierPrice: decimal('supplier_price', { precision: 12, scale: 2 }),
    shippingCost: decimal('shipping_cost', { precision: 12, scale: 2 }),
    taxAmount: decimal('tax_amount', { precision: 12, scale: 2 }),
    totalLandedCost: decimal('total_landed_cost', { precision: 12, scale: 2 }),
    ourPrice: decimal('our_price', { precision: 12, scale: 2 }),
    margin: decimal('margin', { precision: 12, scale: 2 }),
    competitorPrice: decimal('competitor_price', { precision: 12, scale: 2 }),
    pricingRuleId: uuid('pricing_rule_id'),
    algorithmVersion: varchar('algorithm_version', { length: 20 }),
    timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    offerIdx: index('idx_snapshots_offer').on(table.offerId),
    timestampIdx: index('idx_snapshots_timestamp').on(table.timestamp),
  }),
);

// ============================================
// ORDERS
// ============================================

export const orders = pgTable(
  'orders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    orderNumber: varchar('order_number', { length: 50 }).unique().notNull(),
    status: varchar('status', { length: 50 }).default('pending'),
    subtotal: decimal('subtotal', { precision: 12, scale: 2 }).notNull(),
    shippingCost: decimal('shipping_cost', { precision: 12, scale: 2 }).default('0'),
    taxAmount: decimal('tax_amount', { precision: 12, scale: 2 }).default('0'),
    discountAmount: decimal('discount_amount', { precision: 12, scale: 2 }).default('0'),
    total: decimal('total', { precision: 12, scale: 2 }).notNull(),
    currency: varchar('currency', { length: 3 }).default('MXN'),
    shippingAddressId: uuid('shipping_address_id').references(() => addresses.id),
    billingAddress: jsonb('billing_address'),
    paymentMethod: varchar('payment_method', { length: 50 }),
    paymentId: varchar('payment_id', { length: 255 }),
    notes: text('notes'),
    ipAddress: inet('ip_address'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    userIdx: index('idx_orders_user').on(table.userId),
    statusIdx: index('idx_orders_status').on(table.status),
    createdIdx: index('idx_orders_created').on(table.createdAt),
    numberIdx: index('idx_orders_number').on(table.orderNumber),
  }),
);

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, { fields: [orders.userId], references: [users.id] }),
  shippingAddress: one(addresses, {
    fields: [orders.shippingAddressId],
    references: [addresses.id],
  }),
  items: many(orderItems),
  supplierOrders: many(supplierOrders),
  payments: many(payments),
  shipments: many(shipments),
}));

export const orderItems = pgTable(
  'order_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id),
    variantId: uuid('variant_id').references(() => productVariants.id),
    supplierProductId: uuid('supplier_product_id')
      .notNull()
      .references(() => supplierProducts.id),
    quantity: integer('quantity').notNull().default(1),
    unitPrice: decimal('unit_price', { precision: 12, scale: 2 }).notNull(),
    totalPrice: decimal('total_price', { precision: 12, scale: 2 }).notNull(),
    priceSnapshot: jsonb('price_snapshot').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    orderIdx: index('idx_order_items_order').on(table.orderId),
    productIdx: index('idx_order_items_product').on(table.productId),
  }),
);

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  product: one(products, { fields: [orderItems.productId], references: [products.id] }),
  variant: one(productVariants, {
    fields: [orderItems.variantId],
    references: [productVariants.id],
  }),
  supplierProduct: one(supplierProducts, {
    fields: [orderItems.supplierProductId],
    references: [supplierProducts.id],
  }),
}));

export const supplierOrders = pgTable(
  'supplier_orders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    supplierId: uuid('supplier_id')
      .notNull()
      .references(() => suppliers.id),
    supplierOrderId: varchar('supplier_order_id', { length: 255 }),
    status: varchar('status', { length: 50 }).default('pending'),
    totalCost: decimal('total_cost', { precision: 12, scale: 2 }).notNull(),
    currency: varchar('currency', { length: 3 }).default('USD'),
    trackingNumber: varchar('tracking_number', { length: 255 }),
    estimatedDelivery: timestamp('estimated_delivery', { withTimezone: true }),
    actualDelivery: timestamp('actual_delivery', { withTimezone: true }),
    rawResponse: jsonb('raw_response'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    orderIdx: index('idx_supplier_orders_order').on(table.orderId),
    supplierIdx: index('idx_supplier_orders_supplier').on(table.supplierId),
    statusIdx: index('idx_supplier_orders_status').on(table.status),
  }),
);

export const supplierOrdersRelations = relations(supplierOrders, ({ one, many }) => ({
  order: one(orders, { fields: [supplierOrders.orderId], references: [orders.id] }),
  supplier: one(suppliers, {
    fields: [supplierOrders.supplierId],
    references: [suppliers.id],
  }),
  shipments: many(shipments),
}));

// ============================================
// PAYMENTS
// ============================================

export const payments = pgTable(
  'payments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    provider: varchar('provider', { length: 50 }).notNull(),
    providerPaymentId: varchar('provider_payment_id', { length: 255 }),
    amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
    currency: varchar('currency', { length: 3 }).notNull(),
    status: varchar('status', { length: 50 }).default('pending'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    orderIdx: index('idx_payments_order').on(table.orderId),
    statusIdx: index('idx_payments_status').on(table.status),
  }),
);

export const paymentsRelations = relations(payments, ({ one }) => ({
  order: one(orders, { fields: [payments.orderId], references: [orders.id] }),
}));

export const refunds = pgTable(
  'refunds',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    paymentId: uuid('payment_id')
      .notNull()
      .references(() => payments.id),
    amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
    reason: text('reason'),
    status: varchar('status', { length: 50 }).default('pending'),
    providerRefundId: varchar('provider_refund_id', { length: 255 }),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    orderIdx: index('idx_refunds_order').on(table.orderId),
    paymentIdx: index('idx_refunds_payment').on(table.paymentId),
  }),
);

// ============================================
// SHIPPING
// ============================================

export const shipments = pgTable(
  'shipments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    supplierOrderId: uuid('supplier_order_id').references(() => supplierOrders.id),
    carrier: varchar('carrier', { length: 100 }),
    service: varchar('service', { length: 100 }),
    trackingNumber: varchar('tracking_number', { length: 255 }),
    status: varchar('status', { length: 50 }).default('pending'),
    estimatedDelivery: timestamp('estimated_delivery', { withTimezone: true }),
    actualDelivery: timestamp('actual_delivery', { withTimezone: true }),
    weight: decimal('weight', { precision: 8, scale: 2 }),
    dimensions: jsonb('dimensions'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    orderIdx: index('idx_shipments_order').on(table.orderId),
    trackingIdx: index('idx_shipments_tracking').on(table.trackingNumber),
    statusIdx: index('idx_shipments_status').on(table.status),
  }),
);

export const shipmentsRelations = relations(shipments, ({ one, many }) => ({
  order: one(orders, { fields: [shipments.orderId], references: [orders.id] }),
  supplierOrder: one(supplierOrders, {
    fields: [shipments.supplierOrderId],
    references: [supplierOrders.id],
  }),
  events: many(trackingEvents),
}));

export const trackingEvents = pgTable(
  'tracking_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    shipmentId: uuid('shipment_id')
      .notNull()
      .references(() => shipments.id, { onDelete: 'cascade' }),
    status: varchar('status', { length: 100 }).notNull(),
    location: varchar('location', { length: 255 }),
    description: text('description'),
    timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),
    rawData: jsonb('raw_data'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    shipmentIdx: index('idx_tracking_shipment').on(table.shipmentId),
    timestampIdx: index('idx_tracking_timestamp').on(table.timestamp),
  }),
);

export const trackingEventsRelations = relations(trackingEvents, ({ one }) => ({
  shipment: one(shipments, {
    fields: [trackingEvents.shipmentId],
    references: [shipments.id],
  }),
}));

// ============================================
// AUDIT & LOGS
// ============================================

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    entityType: varchar('entity_type', { length: 100 }).notNull(),
    entityId: uuid('entity_id').notNull(),
    action: varchar('action', { length: 50 }).notNull(),
    userId: uuid('user_id').references(() => users.id),
    changes: jsonb('changes'),
    oldValues: jsonb('old_values'),
    newValues: jsonb('new_values'),
    ipAddress: inet('ip_address'),
    userAgent: text('user_agent'),
    timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    entityIdx: index('idx_audit_entity').on(table.entityType, table.entityId),
    userIdx: index('idx_audit_user').on(table.userId),
    timestampIdx: index('idx_audit_timestamp').on(table.timestamp),
  }),
);

export const errorLogs = pgTable(
  'error_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    service: varchar('service', { length: 100 }).notNull(),
    errorType: varchar('error_type', { length: 100 }).notNull(),
    message: text('message').notNull(),
    stackTrace: text('stack_trace'),
    context: jsonb('context'),
    severity: varchar('severity', { length: 20 }).default('error'),
    resolved: boolean('resolved').default(false),
    timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    serviceIdx: index('idx_error_service').on(table.service),
    severityIdx: index('idx_error_severity').on(table.severity),
    timestampIdx: index('idx_error_timestamp').on(table.timestamp),
  }),
);
