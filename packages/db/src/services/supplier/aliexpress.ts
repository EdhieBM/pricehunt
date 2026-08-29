import type {
  IdentifyResult,
  SearchResult,
  ProductData,
  PriceData,
  SearchOptions,
} from '@pricehunt/shared';
import { BaseSupplierAdapter } from './base';

interface AliExpressProductResponse {
  product_id: string;
  product_title: string;
  product_description: string;
  product_main_image_url: string;
  product_images: string[];
  sale_price: string;
  currency: string;
  product_detail_url: string;
  average_star: string;
  total_trade_num: string;
  stock: string;
  shipping_cost: string;
  delivery_time: string;
  product_attributes: Record<string, string>;
}

interface AliExpressSearchResponse {
  products: AliExpressProductResponse[];
  total_results: number;
}

export class AliExpressAdapter extends BaseSupplierAdapter {
  name = 'AliExpress';
  type = 'api' as const;

  private rapidApiKey: string | null;
  private rapidApiHost: string;

  constructor(config: { apiKey?: string; rapidApiKey?: string } = {}) {
    super({
      apiKey: config.apiKey,
      baseUrl: 'https://aliexpress24.p.rapidapi.com',
    });
    this.rapidApiKey = config.rapidApiKey || config.apiKey || null;
    this.rapidApiHost = 'aliexpress24.p.rapidapi.com';
  }

  private extractProductId(url: string): string | null {
    const patterns = [
      /\/item\/(\d+)\.html/,
      /\/item\/(\d+)/,
      /product\/(\d+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match?.[1]) return match[1];
    }
    return null;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };

    if (this.rapidApiKey) {
      headers['X-RapidAPI-Key'] = this.rapidApiKey;
      headers['X-RapidAPI-Host'] = this.rapidApiHost;
    } else if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    return headers;
  }

  async identify(input: { url?: string; text?: string }): Promise<IdentifyResult> {
    if (!input.url) {
      throw new Error('AliExpress adapter requires a URL');
    }

    const productId = this.extractProductId(input.url);
    if (!productId) {
      throw new Error(`Could not extract product ID from URL: ${input.url}`);
    }

    const product = await this.fetchJson<AliExpressProductResponse>(
      `/product/${productId}`,
      { headers: this.getHeaders() },
    );

    return {
      supplierProductId: product.product_id,
      title: product.product_title,
      description: product.product_description ?? null,
      images: [product.product_main_image_url, ...product.product_images],
      price: parseFloat(product.sale_price),
      currency: product.currency || 'USD',
      inStock: parseInt(product.stock) > 0,
      attributes: product.product_attributes || {},
    };
  }

  async search(query: string, options?: SearchOptions): Promise<SearchResult[]> {
    const params = new URLSearchParams({
      q: query,
      limit: String(options?.limit || 10),
      offset: String(options?.offset || 0),
    });

    const response = await this.fetchJson<AliExpressSearchResponse>(
      `/search?${params}`,
      { headers: this.getHeaders() },
    );

    return response.products.map((product) => ({
      supplierProductId: product.product_id,
      title: product.product_title,
      imageUrl: product.product_main_image_url,
      price: parseFloat(product.sale_price),
      currency: product.currency || 'USD',
      inStock: parseInt(product.stock) > 0,
    }));
  }

  async getProduct(supplierProductId: string): Promise<ProductData> {
    const product = await this.fetchJson<AliExpressProductResponse>(
      `/product/${supplierProductId}`,
      { headers: this.getHeaders() },
    );

    return {
      supplierProductId: product.product_id,
      title: product.product_title,
      description: product.product_description ?? null,
      images: [product.product_main_image_url, ...product.product_images],
      attributes: product.product_attributes || {},
      brand: product.product_attributes?.brand || null,
      mpn: product.product_attributes?.mpn || null,
      gtin: product.product_attributes?.gtin || product.product_attributes?.ean || null,
    };
  }

  async getPrice(supplierProductId: string): Promise<PriceData> {
    const product = await this.fetchJson<AliExpressProductResponse>(
      `/product/${supplierProductId}`,
      { headers: this.getHeaders() },
    );

    const shippingCost = parseFloat(product.shipping_cost) || 0;
    const deliveryDays = parseInt(product.delivery_time) || 15;

    return {
      price: parseFloat(product.sale_price),
      currency: product.currency || 'USD',
      shippingCost,
      inStock: parseInt(product.stock) > 0,
      stockQuantity: parseInt(product.stock) || null,
      deliveryDaysMin: Math.max(7, deliveryDays - 5),
      deliveryDaysMax: deliveryDays + 5,
    };
  }
}
