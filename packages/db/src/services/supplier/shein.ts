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

export class SheinAdapter implements SupplierAdapter {
  name = SUPPLIER_TYPE_MAP['shein'] || 'SHEIN';
  type: 'scraping' = 'scraping';
  private baseUrl = 'https://www.shein.com.mx';

  async identify(input: { url?: string; text?: string }): Promise<IdentifyResult> {
    if (!input.url) throw new Error('URL is required for SHEIN identify');

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
      const searchUrl = `${this.baseUrl}/search/${encodeURIComponent(query)}.html`;
      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html',
          'Accept-Language': 'es-MX,es;q=0.9',
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
      brand: 'SHEIN',
      mpn: null,
      gtin: null,
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
      deliveryDaysMin: 7,
      deliveryDaysMax: 21,
    };
  }

  async placeOrder(order: OrderRequest): Promise<OrderResult> {
    throw new Error('SHEIN order placement requires SHEIN Open Platform API');
  }

  async getOrderStatus(supplierOrderId: string): Promise<OrderStatusResult> {
    throw new Error('SHEIN order tracking requires SHEIN Open Platform API');
  }

  extractProductId(url: string): string | null {
    const patterns = [
      /-p-(\d+)\.html/,
      /\/product-p-(\d+)\.html/,
      /shein\.com\.mx.*?-p-(\d+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match?.[1]) return match[1];
    }
    return null;
  }

  private async getProductById(productId: string): Promise<IdentifyResult> {
    try {
      const url = `${this.baseUrl}/product-p-${productId}.html`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html',
          'Accept-Language': 'es-MX,es;q=0.9',
        },
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const html = await response.text();

      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      const title = titleMatch?.[1]?.replace(/ \| SHEIN.*$/i, '').trim() || productId;

      const priceMatch = html.match(/\$[\d,]+\.?\d*/);
      const price = priceMatch ? parseFloat(priceMatch[0].replace(/[$,]/g, '')) : 0;

      const imageMatches = html.match(/https:\/\/img\.shein\.com[^"]+\.(jpg|png|webp)/gi);
      const images = imageMatches ? [...new Set(imageMatches)].slice(0, 5) : [];

      return {
        supplierProductId: productId,
        title,
        description: null,
        images,
        price,
        currency: 'MXN',
        inStock: price > 0,
        attributes: {
          brand: 'SHEIN',
          seller: 'SHEIN',
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
