import type { SupplierAdapter } from '@pricehunt/shared';
import type { SupplierSlug } from '@pricehunt/shared';
import { MercadoLibreAdapter } from './mercadolibre';
import { AliExpressAdapter } from './aliexpress';
import { AmazonAdapter } from './amazon';
import { EbayAdapter } from './ebay';
import { WalmartAdapter } from './walmart';
import { SheinAdapter } from './shein';
import { TemuAdapter } from './temu';
import { TikTokShopAdapter } from './tiktokshop';

type AdapterFactory = (config?: Record<string, string>) => SupplierAdapter;

const adapterFactories: Record<string, AdapterFactory> = {
  mercadolibre: (config) =>
    new MercadoLibreAdapter({
      apiKey: config?.MERCADOLIBRE_API_KEY,
      siteId: config?.MERCADOLIBRE_SITE_ID || 'MLM',
    }),
  aliexpress: (config) =>
    new AliExpressAdapter({
      apiKey: config?.ALIEXPRESS_API_KEY,
      rapidApiKey: config?.ALIEXPRESS_RAPIDAPI_KEY,
    }),
  amazon: (config) =>
    new AmazonAdapter({
      accessKey: config?.AMAZON_ACCESS_KEY,
      secretKey: config?.AMAZON_SECRET_KEY,
      partnerTag: config?.AMAZON_PARTNER_TAG,
    }),
  ebay: (config) =>
    new EbayAdapter({
      appId: config?.EBAY_APP_ID,
      certId: config?.EBAY_CERT_ID,
      authToken: config?.EBAY_AUTH_TOKEN,
    }),
  walmart: (config) =>
    new WalmartAdapter({
      clientId: config?.WALMART_CLIENT_ID,
      clientSecret: config?.WALMART_CLIENT_SECRET,
    }),
  shein: () => new SheinAdapter(),
  temu: () => new TemuAdapter(),
  tiktokshop: () => new TikTokShopAdapter(),
};

const adapterCache = new Map<string, SupplierAdapter>();

export function getSupplierAdapter(
  supplier: SupplierSlug,
  config?: Record<string, string>,
): SupplierAdapter {
  if (!adapterCache.has(supplier)) {
    const factory = adapterFactories[supplier];
    if (!factory) {
      throw new Error(`No adapter registered for supplier: ${supplier}`);
    }
    adapterCache.set(supplier, factory(config));
  }
  return adapterCache.get(supplier)!;
}

export function clearAdapterCache(): void {
  adapterCache.clear();
}

export function getAvailableSuppliers(): SupplierSlug[] {
  return Object.keys(adapterFactories) as SupplierSlug[];
}
