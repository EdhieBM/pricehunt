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

    // Try API first, fall back to scraping
    try {
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
    } catch {
      return this.scrapeProduct(input.url, itemId);
    }
  }

  async search(query: string, options?: SearchOptions): Promise<SearchResult[]> {
    try {
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
    } catch {
      return [];
    }
  }

  async getProduct(supplierProductId: string): Promise<ProductData> {
    try {
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
    } catch {
      return {
        supplierProductId,
        title: 'Mercado Libre Product',
        description: null,
        images: [],
        attributes: {},
        brand: null,
        mpn: null,
        gtin: null,
      };
    }
  }

  async getPrice(supplierProductId: string): Promise<PriceData> {
    try {
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
    } catch {
      return {
        price: 0,
        currency: 'MXN',
        shippingCost: 0,
        inStock: false,
        stockQuantity: null,
        deliveryDaysMin: null,
        deliveryDaysMax: null,
      };
    }
  }

  private async scrapeProduct(url: string, itemId: string): Promise<IdentifyResult> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'es-MX,es;q=0.9',
        },
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const html = await response.text();

      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      const title = titleMatch?.[1]?.replace(/ *[-|].*$/i, '').trim() || itemId;

      // Try JSON-LD
      let price = 0;
      let description: string | null = null;
      let images: string[] = [];
      const jsonLdMatches = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi);
      if (jsonLdMatches) {
        for (const match of jsonLdMatches) {
          const jsonStr = match.replace(/<script[^>]*>/i, '').replace(/<\/script>/i, '');
          try {
            const data = JSON.parse(jsonStr);
            const items = data['@graph'] || (Array.isArray(data) ? data : [data]);
            for (const item of items) {
              if (item?.offers?.price) {
                price = parseFloat(item.offers.price);
              }
              if (item?.image) {
                images = Array.isArray(item.image) ? item.image : [item.image];
              }
              if (item?.description) {
                description = item.description;
              }
            }
          } catch { continue; }
        }
      }

      // Fallback price patterns
      if (price === 0) {
        const pricePatterns = [
          /"price"\s*:\s*([\d,]+\.?\d*)/,
          /class="andes-money-amount__fraction"[^>]*>([\d,]+)</,
          /\$([\d,]+\.?\d*)/,
        ];
        for (const pattern of pricePatterns) {
          const match = html.match(pattern);
          if (match?.[1]) {
            const parsed = parseFloat(match[1].replace(/,/g, ''));
            if (parsed > 0 && parsed < 1000000) {
              price = parsed;
              break;
            }
          }
        }
      }

      if (images.length === 0) {
        const imageMatches = html.match(/https:\/\/[^"]*\.(jpg|png|webp)/gi);
        images = imageMatches ? [...new Set(imageMatches)].slice(0, 5) : [];
      }

      return {
        supplierProductId: itemId,
        title,
        description,
        images,
        price,
        currency: 'MXN',
        inStock: price > 0,
        attributes: {},
      };
    } catch {
      return {
        supplierProductId: itemId,
        title: 'Mercado Libre Product',
        description: null,
        images: [],
        price: 0,
        currency: 'MXN',
        inStock: false,
        attributes: {},
      };
    }
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
