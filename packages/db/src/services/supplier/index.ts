import type { SupplierAdapter } from '@pricehunt/shared';
import type { SupplierSlug } from '@pricehunt/shared';
import { MercadoLibreAdapter } from './mercadolibre';
import { AliExpressAdapter } from './aliexpress';

type AdapterFactory = (config?: Record<string, string>) => SupplierAdapter;

const adapterFactories: Record<SupplierSlug, AdapterFactory> = {
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
  amazon: (_config) => {
    throw new Error('Amazon adapter not yet implemented');
  },
};

const adapterCache = new Map<SupplierSlug, SupplierAdapter>();

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
