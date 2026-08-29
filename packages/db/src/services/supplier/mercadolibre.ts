import type {
  IdentifyResult,
  SearchResult,
  ProductData,
  PriceData,
  SearchOptions,
} from '@pricehunt/shared';
import { BaseSupplierAdapter } from './base';

interface MercadoLibreSearchResponse {
  results: MercadoLibreItem[];
  paging: { total: number; offset: number; limit: number };
}

interface MercadoLibreItem {
  id: string;
  title: string;
  price: number;
  currency_id: string;
  thumbnail: string;
  permalink: string;
  condition: string;
  shipping: {
    free_shipping: boolean;
    cost: number | null;
  };
  seller: { id: number };
  status: string;
  attributes: Array<{ id: string; value_name: string | null }>;
}

interface MercadoLibreItemDetail {
  id: string;
  title: string;
  price: number;
  currency_id: string;
  pictures: Array<{ url: string; size: string }>;
  description: { plain_text: string } | null;
  attributes: Array<{ id: string; name: string; value_name: string | null }>;
  shipping: {
    free_shipping: boolean;
    cost: number | null;
  };
  condition: string;
  status: string;
  seller_id: number;
}

export class MercadoLibreAdapter extends BaseSupplierAdapter {
  name = 'Mercado Libre';
  type = 'api' as const;

  private siteId: string;

  constructor(config: { apiKey?: string; siteId?: string } = {}) {
    super({
      apiKey: config.apiKey,
      baseUrl: 'https://api.mercadolibre.com',
    });
    this.siteId = config.siteId || 'MLM';
  }

  private extractItemId(url: string): string | null {
    const patterns = [
      /\/(MLM-\d+|MLA-\d+|MLB-\d+|MCO-\d+|MLC-\d+|MPE-\d+|MLU-\d+)/,
      /\/p\/(MLM\d+|MLA\d+|MLB\d+|MCO\d+|MLC\d+|MPE\d+|MLU\d+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match?.[1]) return match[1];
    }
    return null;
  }

  async identify(input: { url?: string; text?: string }): Promise<IdentifyResult> {
    if (!input.url) {
      throw new Error('MercadoLibre adapter requires a URL');
    }

    const itemId = this.extractItemId(input.url);
    if (!itemId) {
      throw new Error(`Could not extract item ID from URL: ${input.url}`);
    }

    const item = await this.fetchJson<MercadoLibreItemDetail>(
      `/items/${itemId}`,
    );

    return {
      supplierProductId: item.id,
      title: item.title,
      description: item.description?.plain_text ?? null,
      images: item.pictures.map((p) => p.url),
      price: item.price,
      currency: item.currency_id,
      inStock: item.status === 'active',
      attributes: this.extractAttributes(item.attributes),
    };
  }

  async search(query: string, options?: SearchOptions): Promise<SearchResult[]> {
    const params = new URLSearchParams({
      q: query,
      limit: String(options?.limit || 10),
      offset: String(options?.offset || 0),
    });

    const response = await this.fetchJson<MercadoLibreSearchResponse>(
      `/sites/${this.siteId}/search?${params}`,
    );

    return response.results.map((item) => ({
      supplierProductId: item.id,
      title: item.title,
      imageUrl: item.thumbnail,
      price: item.price,
      currency: item.currency_id,
      inStock: item.status === 'active',
    }));
  }

  async getProduct(supplierProductId: string): Promise<ProductData> {
    const item = await this.fetchJson<MercadoLibreItemDetail>(
      `/items/${supplierProductId}`,
    );

    return {
      supplierProductId: item.id,
      title: item.title,
      description: item.description?.plain_text ?? null,
      images: item.pictures.map((p) => p.url),
      attributes: this.extractAttributes(item.attributes),
      brand: this.findAttribute(item.attributes, 'BRAND'),
      mpn: this.findAttribute(item.attributes, 'MPN'),
      gtin: this.findAttribute(item.attributes, 'EAN'),
    };
  }

  async getPrice(supplierProductId: string): Promise<PriceData> {
    const item = await this.fetchJson<MercadoLibreItemDetail>(
      `/items/${supplierProductId}`,
    );

    return {
      price: item.price,
      currency: item.currency_id,
      shippingCost: item.shipping.free_shipping ? 0 : (item.shipping.cost || 0),
      inStock: item.status === 'active',
      stockQuantity: null,
      deliveryDaysMin: null,
      deliveryDaysMax: null,
    };
  }

  private extractAttributes(
    attributes: Array<{ id: string; name?: string; value_name: string | null }>,
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const attr of attributes) {
      if (attr.value_name) {
        result[attr.id] = attr.value_name;
      }
    }
    return result;
  }

  private findAttribute(
    attributes: Array<{ id: string; value_name: string | null }>,
    attrId: string,
  ): string | null {
    const attr = attributes.find((a) => a.id === attrId);
    return attr?.value_name || null;
  }
}
