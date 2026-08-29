export const ORDER_STATUSES = [
  'pending',
  'pending_payment',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'completed',
  'cancelled',
  'refunded',
] as const;

export const SUPPLIER_ORDER_STATUSES = [
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'failed',
] as const;

export const PAYMENT_STATUSES = ['pending', 'authorized', 'captured', 'failed', 'refunded'] as const;

export const MATCH_TYPES = ['exact', 'variant', 'equivalent', 'similar', 'unknown'] as const;

export const PRICING_STRATEGIES = [
  'auto',
  'competitor_minus_1',
  'competitor_percent',
  'minimum_margin',
  'match_competitor',
  'dynamic',
  'controlled_negative',
] as const;

export const DEFAULT_MIN_MARGIN_PERCENTAGE = 0.02;
export const DEFAULT_CURRENCY = 'MXN';
export const PRICE_CHANGE_THRESHOLD_PERCENTAGE = 0.05;
export const CHECKOUT_TOKEN_EXPIRY_MINUTES = 15;

export const SUPPLIER_TYPE_MAP: Record<string, string> = {
  aliexpress: 'AliExpress',
  amazon: 'Amazon',
  mercadolibre: 'Mercado Libre',
};
