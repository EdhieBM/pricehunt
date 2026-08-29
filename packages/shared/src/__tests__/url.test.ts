import { describe, it, expect } from 'vitest';
import {
  parseProductUrl,
  detectSupplierFromUrl,
  isSupportedSupplierUrl,
  getSupplierName,
} from '../url';

describe('parseProductUrl', () => {
  describe('AliExpress', () => {
    it('parses standard AliExpress URL', () => {
      const result = parseProductUrl('https://www.aliexpress.com/item/1005008039213625.html');
      expect(result).toEqual({
        supplier: 'aliexpress',
        productId: '1005008039213625',
        originalUrl: 'https://www.aliexpress.com/item/1005008039213625.html',
      });
    });

    it('parses AliExpress US URL', () => {
      const result = parseProductUrl('https://www.aliexpress.us/item/1005008039213625.html');
      expect(result).toEqual({
        supplier: 'aliexpress',
        productId: '1005008039213625',
        originalUrl: 'https://www.aliexpress.us/item/1005008039213625.html',
      });
    });

    it('parses AliExpress URL with extra path segments', () => {
      const result = parseProductUrl('https://www.aliexpress.com/w/wholesale-iphone-case/1005008039213625.html');
      expect(result).toEqual({
        supplier: 'aliexpress',
        productId: '1005008039213625',
        originalUrl: 'https://www.aliexpress.com/w/wholesale-iphone-case/1005008039213625.html',
      });
    });
  });

  describe('Amazon', () => {
    it('parses Amazon Mexico URL', () => {
      const result = parseProductUrl('https://www.amazon.com.mx/dp/B09V3KXJPB/ref=sr_1_1');
      expect(result).toEqual({
        supplier: 'amazon',
        productId: 'B09V3KXJPB',
        originalUrl: 'https://www.amazon.com.mx/dp/B09V3KXJPB/ref=sr_1_1',
      });
    });

    it('parses Amazon US URL', () => {
      const result = parseProductUrl('https://www.amazon.com/dp/B09V3KXJPB');
      expect(result).toEqual({
        supplier: 'amazon',
        productId: 'B09V3KXJPB',
        originalUrl: 'https://www.amazon.com/dp/B09V3KXJPB',
      });
    });

    it('parses Amazon gp/product URL', () => {
      const result = parseProductUrl('https://www.amazon.com/gp/product/B09V3KXJPB');
      expect(result).toEqual({
        supplier: 'amazon',
        productId: 'B09V3KXJPB',
        originalUrl: 'https://www.amazon.com/gp/product/B09V3KXJPB',
      });
    });
  });

  describe('MercadoLibre', () => {
    it('parses MercadoLibre Mexico URL', () => {
      const result = parseProductUrl('https://www.mercadolibre.com.mx/apple-iphone-15/p/MLM23456789');
      expect(result).toEqual({
        supplier: 'mercadolibre',
        productId: 'MLM23456789',
        originalUrl: 'https://www.mercadolibre.com.mx/apple-iphone-15/p/MLM23456789',
      });
    });

    it('parses MercadoLibre Argentina URL', () => {
      const result = parseProductUrl('https://www.mercadolibre.com.ar/iphone-15/p/MLA23456789');
      expect(result).toEqual({
        supplier: 'mercadolibre',
        productId: 'MLA23456789',
        originalUrl: 'https://www.mercadolibre.com.ar/iphone-15/p/MLA23456789',
      });
    });

    it('parses MercadoLibre article URL', () => {
      const result = parseProductUrl('https://articulo.mercadolibre.com.mx/MLM-12345678');
      expect(result).toEqual({
        supplier: 'mercadolibre',
        productId: 'MLM-12345678',
        originalUrl: 'https://articulo.mercadolibre.com.mx/MLM-12345678',
      });
    });
  });

  describe('Invalid URLs', () => {
    it('returns null for invalid URL', () => {
      expect(parseProductUrl('not-a-url')).toBeNull();
    });

    it('returns null for unsupported domain', () => {
      expect(parseProductUrl('https://www.ebay.com/item/123')).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(parseProductUrl('')).toBeNull();
    });
  });
});

describe('detectSupplierFromUrl', () => {
  it('detects AliExpress', () => {
    expect(detectSupplierFromUrl('https://www.aliexpress.com/item/123.html')).toBe('aliexpress');
  });

  it('detects Amazon Mexico', () => {
    expect(detectSupplierFromUrl('https://www.amazon.com.mx/dp/B09V3KXJPB')).toBe('amazon');
  });

  it('detects MercadoLibre', () => {
    expect(detectSupplierFromUrl('https://www.mercadolibre.com.mx/item/MLM-123')).toBe('mercadolibre');
  });

  it('returns null for unknown domain', () => {
    expect(detectSupplierFromUrl('https://www.ebay.com/item/123')).toBeNull();
  });
});

describe('isSupportedSupplierUrl', () => {
  it('returns true for supported URL', () => {
    expect(isSupportedSupplierUrl('https://www.aliexpress.com/item/123.html')).toBe(true);
  });

  it('returns false for unsupported URL', () => {
    expect(isSupportedSupplierUrl('https://www.ebay.com/item/123')).toBe(false);
  });
});

describe('getSupplierName', () => {
  it('returns correct names', () => {
    expect(getSupplierName('aliexpress')).toBe('AliExpress');
    expect(getSupplierName('amazon')).toBe('Amazon');
    expect(getSupplierName('mercadolibre')).toBe('Mercado Libre');
  });
});
