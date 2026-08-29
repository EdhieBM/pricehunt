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

interface EbayConfig {
  appId: string;
  certId: string;
  authToken: string;
}

export class EbayAdapter implements SupplierAdapter {
  name = SUPPLIER_TYPE_MAP['ebay'] || 'eBay';
  type: 'api' = 'api';
  private config: EbayConfig;
  private baseUrl = 'https://api.ebay.com';

  constructor(config?: Partial<EbayConfig>) {
    this.config = {
      appId: config?.appId || process.env.EBAY_APP_ID || '',
      certId: config?.certId || process.env.EBAY_CERT_ID || '',
      authToken: config?.authToken || process.env.EBAY_AUTH_TOKEN || '',
    };
  }

  async identify(input: { url?: string; text?: string }): Promise<IdentifyResult> {
    if (!input.url) throw new Error('URL is required for eBay identify');

    const itemId = this.extractItemId(input.url);
    if (!itemId) throw new Error('Could not extract item ID from URL');

    return this.getItemById(itemId);
  }

  async search(query: string, options?: {
    limit?: number;
    offset?: number;
    minPrice?: number;
    maxPrice?: number;
  }): Promise<SearchResult[]> {
    try {
      const params = new URLSearchParams({
        q: query,
        limit: String(options?.limit || 10),
        offset: String(options?.offset || 0),
      });

      if (options?.minPrice) params.set('min_price', String(options.minPrice));
      if (options?.maxPrice) params.set('max_price', String(options.maxPrice));

      const response = await fetch(
        `${this.baseUrl}/buy/browse/v1/item_summary/search?${params}`,
        {
          headers: {
            'Authorization': `Bearer ${this.config.authToken}`,
            'X-EBAY-C-MARKETPLACE-ID': 'EBAY_MX',
            'X-EBAY-C-ENDUSERCTX': 'affiliateCampaignId=<ePNcampaignId>,affiliateReferenceId=<referenceId>',
          },
        },
      );

      if (!response.ok) return [];

      const data = await response.json() as {
        itemSummaries?: Array<{
          itemId: string;
          title: string;
          image?: { imageUrl: string };
          price?: { value: string; currency: string };
          itemWebUrl: string;
          condition: string;
          conditionId: string;
          seller?: { username: string; feedbackPercentage: string; feedbackScore: number };
          buyingOptions?: string[];
        }>;
      };

      return (data.itemSummaries || []).map((item) => ({
        supplierProductId: item.itemId,
        title: item.title,
        imageUrl: item.image?.imageUrl || null,
        price: item.price ? parseFloat(item.price.value) : 0,
        currency: item.price?.currency || 'MXN',
        inStock: item.buyingOptions?.includes('FIXED_PRICE') || false,
      }));
    } catch {
      return [];
    }
  }

  async getProduct(supplierProductId: string): Promise<ProductData> {
    const item = await this.getItemById(supplierProductId);
    return {
      supplierProductId: item.supplierProductId,
      title: item.title,
      description: item.description,
      images: item.images,
      attributes: item.attributes,
      brand: (item.attributes.brand as string) || null,
      mpn: (item.attributes.mpn as string) || null,
      gtin: (item.attributes.gtin as string) || null,
    };
  }

  async getPrice(supplierProductId: string): Promise<PriceData> {
    const item = await this.getItemById(supplierProductId);
    return {
      price: item.price,
      currency: item.currency,
      shippingCost: 0,
      inStock: item.inStock,
      stockQuantity: null,
      deliveryDaysMin: null,
      deliveryDaysMax: null,
    };
  }

  async placeOrder(order: OrderRequest): Promise<OrderResult> {
    throw new Error('eBay order placement requires OAuth user token');
  }

  async getOrderStatus(supplierOrderId: string): Promise<OrderStatusResult> {
    throw new Error('eBay order tracking requires OAuth user token');
  }

  extractItemId(url: string): string | null {
    const patterns = [
      /\/itm\/(\d+)/,
      /\/itm\/.*?\/(\d+)/,
      /\/p\/(\d+)/,
      /\/sp\/.*?\/(\d+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match?.[1]) return match[1];
    }
    return null;
  }

  private async getItemById(itemId: string): Promise<IdentifyResult> {
    try {
      const response = await fetch(
        `${this.baseUrl}/buy/browse/v1/item/${itemId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.config.authToken}`,
            'X-EBAY-C-MARKETPLACE-ID': 'EBAY_MX',
          },
        },
      );

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const item = await response.json() as {
        itemId: string;
        title: string;
        description?: string;
        images?: Array<{ imageUrl: string }>;
        price?: { value: string; currency: string };
        condition: string;
        seller?: { username: string };
        brand?: string;
        mpn?: string;
        gtin?: string;
      };

      return {
        supplierProductId: item.itemId,
        title: item.title,
        description: item.description || null,
        images: (item.images || []).map((img) => img.imageUrl),
        price: item.price ? parseFloat(item.price.value) : 0,
        currency: item.price?.currency || 'MXN',
        inStock: true,
        attributes: {
          brand: item.brand,
          mpn: item.mpn,
          gtin: item.gtin,
          condition: item.condition,
          seller: item.seller?.username,
        },
      };
    } catch {
      return {
        supplierProductId: itemId,
        title: 'Unknown',
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
