import type { UUID } from './product';

export type SupplierType = 'api' | 'feed' | 'scraping' | 'direct';
export type HealthStatus = 'healthy' | 'degraded' | 'down';

export interface Supplier {
  id: UUID;
  name: string;
  slug: string;
  type: SupplierType;
  baseUrl: string | null;
  config: Record<string, unknown>;
  isActive: boolean;
  reliabilityScore: number;
  successRate: number;
  avgResponseTimeMs: number;
  returnRate: number;
  lastHealthCheck: Date | null;
  healthStatus: HealthStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface SupplierAdapter {
  name: string;
  type: SupplierType;

  identify(input: { url?: string; text?: string }): Promise<IdentifyResult>;
  search(query: string, options?: SearchOptions): Promise<SearchResult[]>;
  getProduct(supplierProductId: string): Promise<ProductData>;
  getPrice(supplierProductId: string): Promise<PriceData>;
  placeOrder(order: OrderRequest): Promise<OrderResult>;
  getOrderStatus(supplierOrderId: string): Promise<OrderStatusResult>;
}

export interface IdentifyResult {
  supplierProductId: string;
  title: string;
  description: string | null;
  images: string[];
  price: number;
  currency: string;
  inStock: boolean;
  attributes: Record<string, unknown>;
}

export interface SearchOptions {
  limit?: number;
  offset?: number;
  minPrice?: number;
  maxPrice?: number;
}

export interface SearchResult {
  supplierProductId: string;
  title: string;
  imageUrl: string | null;
  price: number;
  currency: string;
  inStock: boolean;
}

export interface ProductData {
  supplierProductId: string;
  title: string;
  description: string | null;
  images: string[];
  attributes: Record<string, unknown>;
  brand: string | null;
  mpn: string | null;
  gtin: string | null;
}

export interface PriceData {
  price: number;
  currency: string;
  shippingCost: number;
  inStock: boolean;
  stockQuantity: number | null;
  deliveryDaysMin: number | null;
  deliveryDaysMax: number | null;
}

export interface OrderRequest {
  supplierProductId: string;
  quantity: number;
  shippingAddress: {
    name: string;
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone: string;
  };
}

export interface OrderResult {
  supplierOrderId: string;
  status: string;
  totalCost: number;
  currency: string;
  estimatedDelivery: Date | null;
}

export interface OrderStatusResult {
  supplierOrderId: string;
  status: string;
  trackingNumber: string | null;
  estimatedDelivery: Date | null;
}
