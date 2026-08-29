import type {
  SupplierAdapter,
  IdentifyResult,
  SearchResult,
  ProductData,
  PriceData,
  OrderRequest,
  OrderResult,
  OrderStatusResult,
} from '@pricehunt/shared';
import { SUPPLIER_TYPE_MAP } from '@pricehunt/shared';

interface WalmartConfig {
  clientId: string;
  clientSecret: string;
}

export class WalmartAdapter implements SupplierAdapter {
  name = SUPPLIER_TYPE_MAP['walmart'] || 'Walmart';
  type: 'api' = 'api';
  private config: WalmartConfig;
  private baseUrl = 'https://www.walmart.com.mx';

  constructor(config?: Partial<WalmartConfig>) {
    this.config = {
      clientId: config?.clientId || process.env.WALMART_CLIENT_ID || '',
      clientSecret: config?.clientSecret || process.env.WALMART_CLIENT_SECRET || '',
    };
  }

  async identify(input: { url?: string; text?: string }): Promise<IdentifyResult> {
    if (!input.url) throw new Error('URL is required for Walmart identify');

    const productId = this.extractProductId(input.url);
    if (!productId) throw new Error('Could not extract product ID from URL');

    return this.getProductById(productId);
  }

  async search(query: string, options?: {
    limit?: number;
    offset?: number;
    minPrice?: number;
    maxPrice?: number;
  }): Promise<SearchResult[]> {
    try {
      const searchUrl = new URL(`${this.baseUrl}/search`);
      searchUrl.searchParams.set('q', query);
      if (options?.minPrice) searchUrl.searchParams.set('min_price', String(options.minPrice));
      if (options?.maxPrice) searchUrl.searchParams.set('max_price', String(options.maxPrice));

      const response = await fetch(searchUrl.toString(), {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
        },
      });

      if (!response.ok) return [];

      const html = await response.text();
      const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g);

      if (!jsonLdMatch) return [];

      const results: SearchResult[] = [];

      for (const match of jsonLdMatch) {
        const jsonStr = match.replace(/<script[^>]*>/, '').replace(/<\/script>/, '');
        try {
          const data = JSON.parse(jsonStr) as {
            '@type': string;
            name: string;
            image: string;
            offers?: { price: string; priceCurrency: string };
            sku?: string;
          };

          if (data['@type'] === 'Product') {
            results.push({
              supplierProductId: data.sku || data.name,
              title: data.name,
              imageUrl: data.image,
              price: data.offers ? parseFloat(data.offers.price) : 0,
              currency: data.offers?.priceCurrency || 'MXN',
              inStock: true,
            });
          }
        } catch {
          continue;
        }
      }

      return results.slice(0, options?.limit || 10);
    } catch {
      return [];
    }
  }

  async getProduct(supplierProductId: string): Promise<ProductData> {
    const product = await this.getProductById(supplierProductId);
    return {
      supplierProductId: product.supplierProductId,
      title: product.title,
      description: product.description,
      images: product.images,
      attributes: product.attributes,
      brand: (product.attributes.brand as string) || null,
      mpn: (product.attributes.mpn as string) || null,
      gtin: (product.attributes.gtin as string) || null,
    };
  }

  async getPrice(supplierProductId: string): Promise<PriceData> {
    const product = await this.getProductById(supplierProductId);
    return {
      price: product.price,
      currency: product.currency,
      shippingCost: 0,
      inStock: product.inStock,
      stockQuantity: null,
      deliveryDaysMin: null,
      deliveryDaysMax: null,
    };
  }

  async placeOrder(order: OrderRequest): Promise<OrderResult> {
    throw new Error('Walmart order placement requires Walmart Connect API');
  }

  async getOrderStatus(supplierOrderId: string): Promise<OrderStatusResult> {
    throw new Error('Walmart order tracking requires Walmart Connect API');
  }

  extractProductId(url: string): string | null {
    const patterns = [
      /\/ip\/([^/]+)/,
      /\/product\/([^/]+)/,
      /\/[^/]+\/(\d{8,})/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match?.[1]) return match[1];
    }
    return null;
  }

  private async getProductById(productId: string): Promise<IdentifyResult> {
    try {
      const url = `${this.baseUrl}/ip/${productId}`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html',
        },
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const html = await response.text();

      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      const title = titleMatch?.[1]?.replace(/ \| Walmart.*$/i, '').trim() || productId;

      const priceMatch = html.match(/\$[\d,]+\.?\d*/);
      const price = priceMatch ? parseFloat(priceMatch[0].replace(/[$,]/g, '')) : 0;

      const imageMatches = html.match(/https:\/\/[^"]*walmart[^"]*\.(jpg|png|webp)/gi);
      const images = imageMatches ? [...new Set(imageMatches)].slice(0, 5) : [];

      const brandMatch = html.match(/"brand":\s*\{\s*"name":\s*"([^"]+)"/i);
      const brand = brandMatch?.[1] || null;

      return {
        supplierProductId: productId,
        title,
        description: null,
        images,
        price,
        currency: 'MXN',
        inStock: price > 0,
        attributes: {
          brand,
          seller: 'Walmart',
        },
      };
    } catch {
      return {
        supplierProductId: productId,
        title: productId,
        description: null,
        images: [],
        price: 0,
        currency: 'MXN',
        inStock: false,
        attributes: {},
      };
    }
  }
}
