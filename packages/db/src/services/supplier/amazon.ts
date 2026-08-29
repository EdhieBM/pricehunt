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

interface AmazonConfig {
  accessKey: string;
  secretKey: string;
  partnerTag: string;
  region: string;
  marketplace: string;
}

const MARKETPLACES: Record<string, { domain: string; country: string }> = {
  'www.amazon.com.mx': { domain: 'www.amazon.com.mx', country: 'MX' },
  'www.amazon.com': { domain: 'www.amazon.com', country: 'US' },
  'www.amazon.ca': { domain: 'www.amazon.ca', country: 'CA' },
};

export class AmazonAdapter implements SupplierAdapter {
  name = SUPPLIER_TYPE_MAP['amazon'] || 'Amazon';
  type: 'api' = 'api';
  private config: AmazonConfig;

  constructor(config?: Partial<AmazonConfig>) {
    this.config = {
      accessKey: config?.accessKey || process.env.AMAZON_ACCESS_KEY || '',
      secretKey: config?.secretKey || process.env.AMAZON_SECRET_KEY || '',
      partnerTag: config?.partnerTag || process.env.AMAZON_PARTNER_TAG || '',
      region: config?.region || process.env.AMAZON_REGION || 'us-east-1',
      marketplace: config?.marketplace || 'www.amazon.com.mx',
    };
  }

  async identify(input: { url?: string; text?: string }): Promise<IdentifyResult> {
    if (!input.url) throw new Error('URL is required for Amazon identify');

    const asin = this.extractASIN(input.url);
    if (!asin) throw new Error('Could not extract ASIN from URL');

    const product = await this.getProductByASIN(asin);

    return {
      supplierProductId: asin,
      title: product.title,
      description: product.description,
      images: product.images,
      price: product.price,
      currency: product.currency,
      inStock: product.inStock,
      attributes: {
        brand: product.brand,
        mpn: product.mpn,
        gtin: product.gtin,
        rating: product.rating,
        reviewCount: product.reviewCount,
        seller: product.seller,
      },
    };
  }

  async search(query: string, options?: {
    limit?: number;
    offset?: number;
    minPrice?: number;
    maxPrice?: number;
  }): Promise<SearchResult[]> {
    try {
      const results = await this.searchAmazon(query, options);
      return results.map((item) => ({
        supplierProductId: item.asin,
        title: item.title,
        imageUrl: item.imageUrl,
        price: item.price,
        currency: item.currency,
        inStock: item.inStock,
      }));
    } catch {
      return [];
    }
  }

  async getProduct(supplierProductId: string): Promise<ProductData> {
    const product = await this.getProductByASIN(supplierProductId);
    return {
      supplierProductId: supplierProductId,
      title: product.title,
      description: product.description,
      images: product.images,
      attributes: {
        brand: product.brand,
        mpn: product.mpn,
        gtin: product.gtin,
        rating: product.rating,
        reviewCount: product.reviewCount,
        seller: product.seller,
        category: product.category,
      },
      brand: product.brand,
      mpn: product.mpn,
      gtin: product.gtin,
    };
  }

  async getPrice(supplierProductId: string): Promise<PriceData> {
    const price = await this.getPriceByASIN(supplierProductId);
    return {
      price: price.price,
      currency: price.currency,
      shippingCost: price.shippingCost,
      inStock: price.inStock,
      stockQuantity: price.stockQuantity,
      deliveryDaysMin: price.deliveryDaysMin,
      deliveryDaysMax: price.deliveryDaysMax,
    };
  }

  async placeOrder(order: OrderRequest): Promise<OrderResult> {
    throw new Error('Amazon order placement requires Amazon Marketplace Web Service (MWS)');
  }

  async getOrderStatus(supplierOrderId: string): Promise<OrderStatusResult> {
    throw new Error('Amazon order tracking requires MWS integration');
  }

  extractASIN(url: string): string | null {
    const patterns = [
      /\/dp\/([A-Z0-9]{10})/i,
      /\/gp\/product\/([A-Z0-9]{10})/i,
      /\/product\/([A-Z0-9]{10})/i,
      /\/ASIN\/([A-Z0-9]{10})/i,
      /\/exec\/obidos\/ASIN\/([A-Z0-9]{10})/i,
      /\/seller\/([A-Z0-9]{10})/i,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match?.[1]) return match[1].toUpperCase();
    }
    return null;
  }

  private async searchAmazon(query: string, options?: {
    limit?: number;
    offset?: number;
    minPrice?: number;
    maxPrice?: number;
  }): Promise<Array<{
    asin: string;
    title: string;
    imageUrl: string | null;
    price: number;
    currency: string;
    inStock: boolean;
  }>> {
    const encodedQuery = encodeURIComponent(query);
    const apiUrl = `https://api.search.brave.com/res/v1/web/search?q=site:amazon.com.mx+${encodedQuery}`;

    try {
      const response = await fetch(apiUrl, {
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip',
          'X-Subscription-Token': process.env.BRAVE_SEARCH_API_KEY || '',
        },
      });

      if (!response.ok) return [];

      const data = await response.json() as {
        web?: { results?: Array<{ title: string; url: string; description: string }> };
      };

      const results: Array<{
        asin: string;
        title: string;
        imageUrl: string | null;
        price: number;
        currency: string;
        inStock: boolean;
      }> = [];

      if (data.web?.results) {
        for (const result of data.web.results) {
          const asin = this.extractASIN(result.url);
          if (asin) {
            results.push({
              asin,
              title: result.title,
              imageUrl: null,
              price: 0,
              currency: 'MXN',
              inStock: true,
            });
          }
        }
      }

      return results.slice(0, options?.limit || 10);
    } catch {
      return [];
    }
  }

  private async getProductByASIN(asin: string): Promise<{
    title: string;
    description: string | null;
    images: string[];
    price: number;
    currency: string;
    inStock: boolean;
    brand: string | null;
    mpn: string | null;
    gtin: string | null;
    rating: number | null;
    reviewCount: number | null;
    seller: string | null;
    category: string | null;
  }> {
    const url = `https://www.amazon.com.mx/dp/${asin}`;

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'es-MX,es;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate',
          'Cache-Control': 'no-cache',
        },
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const html = await response.text();

      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      const title = titleMatch?.[1]?.replace(/ *[-|].*$/i, '').replace(/ *:.*$/, '').trim() || asin;

      // Try JSON-LD first (most reliable)
      let price = 0;
      const jsonLdMatches = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi);
      if (jsonLdMatches) {
        for (const match of jsonLdMatches) {
          const jsonStr = match.replace(/<script[^>]*>/i, '').replace(/<\/script>/i, '');
          try {
            const data = JSON.parse(jsonStr);
            // Handle @graph array
            const items = data['@graph'] || (Array.isArray(data) ? data : [data]);
            for (const item of items) {
              if (item?.offers?.price) {
                price = parseFloat(item.offers.price);
                break;
              }
              if (item?.offers?.lowPrice) {
                price = parseFloat(item.offers.lowPrice);
                break;
              }
            }
            if (price > 0) break;
          } catch { continue; }
        }
      }

      // Fallback: look for price in various Amazon-specific patterns
      if (price === 0) {
        const pricePatterns = [
          /"priceAmount"\s*:\s*([\d,]+\.?\d*)/,
          /"price"\s*:\s*"?([\d,]+\.?\d*)"?/,
          /class="a-price-whole"[^>]*>([\d,]+)<\/span>.*?class="a-price-fraction"[^>]*>(\d+)/s,
          /id="priceblock_ourprice"[^>]*>\$?([\d,]+\.?\d*)/,
          /id="priceblock_dealprice"[^>]*>\$?([\d,]+\.?\d*)/,
          /"a-price"[^>]*>.*?(\d[\d,]*\.?\d*)/,
          /\$(\d[\d,]*\.?\d*)/,
        ];

        for (const pattern of pricePatterns) {
          const match = html.match(pattern);
          if (match?.[1]) {
            const priceStr = match[1].replace(/,/g, '');
            const parsed = parseFloat(priceStr);
            if (parsed > 0 && parsed < 100000) {
              price = parsed;
              break;
            }
          }
        }
      }

      const imageMatches = html.match(/https:\/\/m\.media-amazon\.com\/images\/I\/[^"]+\.(jpg|png|webp)/gi);
      const images = imageMatches ? [...new Set(imageMatches)].slice(0, 5) : [];

      // Try multiple brand patterns
      let brand = null;
      const brandPatterns = [
        /bylineInfo["']\s*content=["']([^"']+)["']/i,
        /class="po-brand"[^>]*>.*?<span[^>]*>([^<]+)</is,
        /"brand"\s*:\s*"([^"]+)"/i,
        /Marcas:\s*<[^>]*>([^<]+)/i,
      ];
      for (const pattern of brandPatterns) {
        const match = html.match(pattern);
        if (match?.[1]) {
          brand = match[1].replace(/^Marca:\s*/i, '').trim();
          if (brand && brand.length > 1 && brand.length < 100) break;
          brand = null;
        }
      }

      return {
        title,
        description: null,
        images,
        price,
        currency: 'MXN',
        inStock: price > 0,
        brand,
        mpn: null,
        gtin: null,
        rating: null,
        reviewCount: null,
        seller: null,
        category: null,
      };
    } catch {
      return {
        title: asin,
        description: null,
        images: [],
        price: 0,
        currency: 'MXN',
        inStock: false,
        brand: null,
        mpn: null,
        gtin: null,
        rating: null,
        reviewCount: null,
        seller: null,
        category: null,
      };
    }
  }

  private async getPriceByASIN(asin: string): Promise<PriceData> {
    const product = await this.getProductByASIN(asin);
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
}
