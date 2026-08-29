import type {
  SupplierAdapter,
  IdentifyResult,
  SearchResult,
  ProductData,
  PriceData,
  OrderRequest,
  OrderResult,
  OrderStatusResult,
  SearchOptions,
} from '@pricehunt/shared';

export abstract class BaseSupplierAdapter implements SupplierAdapter {
  abstract name: string;
  abstract type: 'api' | 'feed' | 'scraping' | 'direct';

  protected apiKey: string | null;
  protected baseUrl: string;

  constructor(config: { apiKey?: string; baseUrl: string }) {
    this.apiKey = config.apiKey || null;
    this.baseUrl = config.baseUrl;
  }

  protected async fetchJson<T>(path: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      ...(options?.headers as Record<string, string> || {}),
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const response = await fetch(url, { ...options, headers });

    if (!response.ok) {
      const text = await response.text().catch(() => 'Unknown error');
      throw new Error(`${this.name} API error ${response.status}: ${text}`);
    }

    return response.json() as Promise<T>;
  }

  abstract identify(input: { url?: string; text?: string }): Promise<IdentifyResult>;
  abstract search(query: string, options?: SearchOptions): Promise<SearchResult[]>;
  abstract getProduct(supplierProductId: string): Promise<ProductData>;
  abstract getPrice(supplierProductId: string): Promise<PriceData>;

  async placeOrder(_order: OrderRequest): Promise<OrderResult> {
    throw new Error(`${this.name} does not support order placement`);
  }

  async getOrderStatus(_supplierOrderId: string): Promise<OrderStatusResult> {
    throw new Error(`${this.name} does not support order status`);
  }
}
