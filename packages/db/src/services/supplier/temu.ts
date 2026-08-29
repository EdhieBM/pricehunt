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

export class TemuAdapter implements SupplierAdapter {
  name = SUPPLIER_TYPE_MAP['temu'] || 'Temu';
  type: 'scraping' = 'scraping';
  private baseUrl = 'https://www.temu.com.mx';

  async identify(input: { url?: string; text?: string }): Promise<IdentifyResult> {
    if (!input.url) throw new Error('URL is required for Temu identify');

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
      const searchUrl = `${this.baseUrl}/search_result.html?search_key=${encodeURIComponent(query)}`;
      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html',
          'Accept-Language': 'es-MX,es;q=0.9',
        },
      });

      if (!response.ok) return [];

      const html = await response.text();
      const results: SearchResult[] = [];

      const goodsMatch = html.match(/"goods_id"\s*:\s*"(\d+)"[\s\S]*?"goods_name"\s*:\s*"([^"]+)"[\s\S]*?"min_price"\s*:\s*(\d+)/g);
      if (goodsMatch) {
        for (const match of goodsMatch.slice(0, options?.limit || 10)) {
          const idMatch = match.match(/"goods_id"\s*:\s*"(\d+)"/);
          const nameMatch = match.match(/"goods_name"\s*:\s*"([^"]+)"/);
          const priceMatch = match.match(/"min_price"\s*:\s*(\d+)/);

          if (idMatch?.[1] && nameMatch?.[1]) {
            results.push({
              supplierProductId: idMatch[1],
              title: nameMatch[1],
              imageUrl: null,
              price: priceMatch?.[1] ? parseInt(priceMatch[1]) / 100 : 0,
              currency: 'MXN',
              inStock: true,
            });
          }
        }
      }

      return results;
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
      brand: null,
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
    throw new Error('Temu does not support external order placement');
  }

  async getOrderStatus(supplierOrderId: string): Promise<OrderStatusResult> {
    throw new Error('Temu does not support external order tracking');
  }

  extractProductId(url: string): string | null {
    const patterns = [
      /-goods-(\d+)\.html/,
      /\/goods\.html\?.*goods_id=(\d+)/,
      /temu\.com.*?goods_id=(\d+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match?.[1]) return match[1];
    }
    return null;
  }

  private async getProductById(productId: string): Promise<IdentifyResult> {
    try {
      const url = `${this.baseUrl}/goods.html?goods_id=${productId}`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html',
          'Accept-Language': 'es-MX,es;q=0.9',
        },
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const html = await response.text();

      const titleMatch = html.match(/"goods_name"\s*:\s*"([^"]+)"/);
      const title = titleMatch?.[1] || productId;

      const priceMatch = html.match(/"min_price"\s*:\s*(\d+)/);
      const price = priceMatch?.[1] ? parseInt(priceMatch[1], 10) / 100 : 0;

      const imageMatch = html.match(/"thumb_url"\s*:\s*"([^"]+)"/);
      const images = imageMatch?.[1] ? [imageMatch[1]] : [];

      return {
        supplierProductId: productId,
        title,
        description: null,
        images,
        price,
        currency: 'MXN',
        inStock: price > 0,
        attributes: {
          seller: 'Temu',
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
