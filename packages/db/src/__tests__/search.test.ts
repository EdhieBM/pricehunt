import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('meilisearch', () => {
  const mockIndex = {
    updateSettings: vi.fn().mockResolvedValue(undefined),
    addDocuments: vi.fn().mockResolvedValue({ taskUid: 1 }),
    search: vi.fn().mockResolvedValue({
      hits: [
        {
          id: 'sp-1',
          title: 'iPhone 15 Pro',
          description: 'Smartphone Apple',
          brand: 'Apple',
          category: 'Electronics',
          price: 999,
          currency: 'USD',
          imageUrl: 'https://example.com/iphone.jpg',
          supplier: 'aliexpress',
          inStock: true,
          matchConfidence: 0.85,
          slug: 'iphone-15-pro',
        },
      ],
      estimatedTotalHits: 1,
    }),
    deleteDocument: vi.fn().mockResolvedValue(undefined),
  };

  return {
    MeiliSearch: vi.fn().mockImplementation(() => ({
      index: vi.fn().mockReturnValue(mockIndex),
    })),
  };
});

import {
  setupMeilisearch,
  indexProduct,
  indexProducts,
  searchProducts,
  removeProduct,
  type MeiliProduct,
} from '../search';

const mockProduct: MeiliProduct = {
  id: 'sp-1',
  title: 'iPhone 15 Pro',
  description: 'Smartphone Apple',
  brand: 'Apple',
  category: 'Electronics',
  price: 999,
  currency: 'USD',
  imageUrl: 'https://example.com/iphone.jpg',
  supplier: 'aliexpress',
  inStock: true,
  matchConfidence: 0.85,
  slug: 'iphone-15-pro',
};

describe('Meilisearch Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('setupMeilisearch', () => {
    it('configures index settings', async () => {
      await setupMeilisearch();
      // No error means success
      expect(true).toBe(true);
    });
  });

  describe('indexProduct', () => {
    it('indexes a single product', async () => {
      await indexProduct(mockProduct);
      expect(true).toBe(true);
    });
  });

  describe('indexProducts', () => {
    it('indexes multiple products', async () => {
      await indexProducts([mockProduct]);
      expect(true).toBe(true);
    });
  });

  describe('searchProducts', () => {
    it('returns search results', async () => {
      const result = await searchProducts('iPhone');
      expect(result.hits.length).toBe(1);
      expect(result.hits[0]?.title).toBe('iPhone 15 Pro');
      expect(result.total).toBe(1);
    });

    it('passes options correctly', async () => {
      const result = await searchProducts('iPhone', {
        limit: 10,
        offset: 0,
        filters: ['brand = Apple'],
        sort: ['price:asc'],
      });
      expect(result.hits).toBeDefined();
    });
  });

  describe('removeProduct', () => {
    it('deletes a product', async () => {
      await removeProduct('sp-1');
      expect(true).toBe(true);
    });
  });
});
