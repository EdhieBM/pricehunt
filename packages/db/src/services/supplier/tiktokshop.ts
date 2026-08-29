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

export class TikTokShopAdapter implements SupplierAdapter {
  name = SUPPLIER_TYPE_MAP['tiktokshop'] || 'TikTok Shop';
  type: 'scraping' = 'scraping';

  async identify(input: { url?: string; text?: string }): Promise<IdentifyResult> {
    if (!input.url) throw new Error('URL is required for TikTok Shop identify');

    const productId = this.extractProductId(input.url);
    if (!productId) throw new Error('Could not extract product ID from TikTok URL');

    return this.getProductFromPage(input.url);
  }

  async search(query: string, options?: {
    limit?: number;
    offset?: number;
  }): Promise<SearchResult[]> {
    try {
      const searchUrl = `https://www.tiktok.com/search?q=${encodeURIComponent(query)}&t=${Date.now()}`;
      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html',
        },
      });

      if (!response.ok) return [];

      return [];
    } catch {
      return [];
    }
  }

  async getProduct(supplierProductId: string): Promise<ProductData> {
    return {
      supplierProductId,
      title: 'TikTok Product',
      description: null,
      images: [],
      attributes: {},
      brand: null,
      mpn: null,
      gtin: null,
    };
  }

  async getPrice(supplierProductId: string): Promise<PriceData> {
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

  async placeOrder(order: OrderRequest): Promise<OrderResult> {
    throw new Error('TikTok Shop is not a supplier — use this to find cheaper alternatives');
  }

  async getOrderStatus(supplierOrderId: string): Promise<OrderStatusResult> {
    throw new Error('TikTok Shop is not a supplier');
  }

  extractProductId(url: string): string | null {
    const patterns = [
      /\/product\/(\d+)/,
      /\/p\/(\d+)/,
      /product_id=(\d+)/,
      /items\/(\d+)/,
      /\/(\d{15,})/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match?.[1]) return match[1];
    }
    return null;
  }

  private async getProductFromPage(url: string): Promise<IdentifyResult> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html',
        },
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const html = await response.text();

      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i) ||
        html.match(/"title"\s*:\s*"([^"]+)"/);
      const title = titleMatch?.[1]?.replace(/ \| TikTok.*$/i, '').trim() || 'TikTok Product';

      const priceMatch = html.match(/\$[\d,]+\.?\d*/) ||
        html.match(/"price"\s*:\s*[\d.]+/);
      const price = priceMatch ? parseFloat(priceMatch[0].replace(/[$",]/g, '')) : 0;

      const imageMatches = html.match(/https:\/\/[^"]*tiktok[^"]*\.(jpg|png|webp)/gi);
      const images = imageMatches ? [...new Set(imageMatches)].slice(0, 5) : [];

      const descriptionMatch = html.match(/"description"\s*:\s*"([^"]{10,200})"/);
      const description = descriptionMatch?.[1] || null;

      return {
        supplierProductId: this.extractProductId(url) || 'unknown',
        title,
        description,
        images,
        price,
        currency: 'MXN',
        inStock: price > 0,
        attributes: {
          platform: 'TikTok Shop',
          originalUrl: url,
        },
      };
    } catch {
      return {
        supplierProductId: this.extractProductId(url) || 'unknown',
        title: 'TikTok Product',
        description: null,
        images: [],
        price: 0,
        currency: 'MXN',
        inStock: false,
        attributes: {
          platform: 'TikTok Shop',
          originalUrl: url,
        },
      };
    }
  }
}
