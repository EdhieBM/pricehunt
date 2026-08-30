import { MeiliSearch } from 'meilisearch';

let client: MeiliSearch | null = null;

export function getMeiliClient(): MeiliSearch {
  if (!client) {
    client = new MeiliSearch({
      host: process.env.MEILISEARCH_URL || process.env.MEILISEARCH_HOST || 'http://localhost:7700',
      apiKey: process.env.MEILISEARCH_MASTER_KEY || process.env.MEILISEARCH_KEY || 'dev-master-key',
    });
  }
  return client;
}

export interface MeiliProduct {
  id: string;
  title: string;
  description: string | null;
  brand: string | null;
  category: string | null;
  price: number;
  currency: string;
  imageUrl: string | null;
  supplier: string;
  inStock: boolean;
  matchConfidence: number;
  slug: string;
}

const PRODUCTS_INDEX = 'products';

export async function setupMeilisearch(): Promise<void> {
  const meili = getMeiliClient();

  const index = meili.index(PRODUCTS_INDEX);

  await index.updateSettings({
    searchableAttributes: [
      'title',
      'description',
      'brand',
      'category',
      'supplier',
    ],
    filterableAttributes: [
      'brand',
      'category',
      'supplier',
      'inStock',
      'price',
    ],
    sortableAttributes: [
      'price',
      'matchConfidence',
    ],
  });
}

export async function indexProduct(product: MeiliProduct): Promise<void> {
  const meili = getMeiliClient();
  const index = meili.index(PRODUCTS_INDEX);
  await index.addDocuments([product]);
}

export async function indexProducts(products: MeiliProduct[]): Promise<void> {
  const meili = getMeiliClient();
  const index = meili.index(PRODUCTS_INDEX);
  await index.addDocuments(products);
}

export async function searchProducts(
  query: string,
  options?: {
    limit?: number;
    offset?: number;
    filters?: string[];
    sort?: string[];
  },
): Promise<{ hits: MeiliProduct[]; total: number }> {
  const meili = getMeiliClient();
  const index = meili.index(PRODUCTS_INDEX);

  const result = await index.search(query, {
    limit: options?.limit || 20,
    offset: options?.offset || 0,
    filter: options?.filters,
    sort: options?.sort,
  });

  return {
    hits: result.hits as MeiliProduct[],
    total: result.estimatedTotalHits || result.hits.length,
  };
}

export async function removeProduct(productId: string): Promise<void> {
  const meili = getMeiliClient();
  const index = meili.index(PRODUCTS_INDEX);
  await index.deleteDocument(productId);
}
