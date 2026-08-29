import { describe, it, expect } from 'vitest';
import { calculateMatch, findBestMatch } from '../services/matching';
import { calculatePrice, selectStrategy } from '../services/pricing';

describe('Matching Engine', () => {
  describe('calculateMatch', () => {
    it('returns 100% confidence for GTIN match', () => {
      const result = calculateMatch(
        {
          title: 'iPhone 15 Case',
          brand: 'Apple',
          gtin: '1234567890123',
          attributes: {},
        },
        {
          title: 'iPhone 15 Funda',
          brand: 'Apple',
          gtin: '1234567890123',
          attributes: {},
        },
      );

      expect(result.confidence).toBe(1.0);
      expect(result.type).toBe('exact');
    });

    it('scores high for similar titles with same brand', () => {
      const result = calculateMatch(
        {
          title: 'iPhone 15 Pro Max Case',
          brand: 'Apple',
          gtin: null,
          attributes: { color: 'black' },
        },
        {
          title: 'iPhone 15 Pro Max Case Black',
          brand: 'Apple',
          gtin: null,
          attributes: { color: 'black' },
        },
      );

      expect(result.confidence).toBeGreaterThan(0.7);
      expect(result.type).not.toBe('unknown');
    });

    it('scores low for different products', () => {
      const result = calculateMatch(
        {
          title: 'iPhone 15 Case',
          brand: 'Apple',
          gtin: null,
          attributes: {},
        },
        {
          title: 'Samsung Galaxy S24 Screen Protector',
          brand: 'Samsung',
          gtin: null,
          attributes: {},
        },
      );

      expect(result.confidence).toBeLessThan(0.5);
    });

    it('handles null brands', () => {
      const result = calculateMatch(
        {
          title: 'Phone Case',
          brand: null,
          gtin: null,
          attributes: {},
        },
        {
          title: 'Phone Case',
          brand: null,
          gtin: null,
          attributes: {},
        },
      );

      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('compares attributes', () => {
      const result = calculateMatch(
        {
          title: 'Phone Case',
          brand: 'Generic',
          gtin: null,
          attributes: { color: 'black', size: 'M' },
        },
        {
          title: 'Phone Case',
          brand: 'Generic',
          gtin: null,
          attributes: { color: 'black', size: 'M' },
        },
      );

      expect(result.factors.attributeScore).toBe(1.0);
    });
  });

  describe('findBestMatch', () => {
    it('finds the best match from candidates', () => {
      const target = {
        title: 'iPhone 15 Pro Case',
        brand: 'Apple',
        gtin: '1234567890123',
        attributes: {},
      };

      const candidates = [
        {
          id: '1',
          title: 'Samsung Galaxy Case',
          brand: 'Samsung',
          gtin: null,
          attributes: {},
        },
        {
          id: '2',
          title: 'iPhone 15 Pro Case',
          brand: 'Apple',
          gtin: '1234567890123',
          attributes: {},
        },
        {
          id: '3',
          title: 'iPhone 15 Case',
          brand: 'Apple',
          gtin: null,
          attributes: {},
        },
      ];

      const result = findBestMatch(target, candidates);
      expect(result).not.toBeNull();
      expect(result!.candidateId).toBe('2');
      expect(result!.match.confidence).toBe(1.0);
    });

    it('returns null for empty candidates', () => {
      const result = findBestMatch(
        { title: 'Test', brand: null, gtin: null, attributes: {} },
        [],
      );
      expect(result).toBeNull();
    });
  });
});

describe('Pricing Engine', () => {
  describe('calculatePrice', () => {
    it('calculates minimum margin correctly', () => {
      const result = calculatePrice({
        supplierCost: 100,
        currency: 'USD',
        shippingCost: 10,
        taxAmount: 5,
        strategy: 'minimum_margin',
      });

      expect(result.ourPrice).toBeGreaterThan(115);
      expect(result.margin).toBeGreaterThan(0);
      expect(result.marginPercentage).toBeGreaterThan(0);
    });

    it('applies competitor_minus_1 strategy', () => {
      const result = calculatePrice({
        supplierCost: 80,
        currency: 'USD',
        shippingCost: 10,
        taxAmount: 5,
        competitorPrice: 120,
        strategy: 'competitor_minus_1',
      });

      expect(result.ourPrice).toBe(119);
    });

    it('does not go below minimum price', () => {
      const result = calculatePrice({
        supplierCost: 100,
        currency: 'USD',
        shippingCost: 10,
        taxAmount: 5,
        competitorPrice: 100,
        strategy: 'competitor_minus_1',
      });

      const landedCost = 115;
      const minPrice = landedCost * 1.02;
      expect(result.ourPrice).toBeGreaterThanOrEqual(minPrice);
    });

    it('matches competitor when price is above minimum', () => {
      const result = calculatePrice({
        supplierCost: 80,
        currency: 'USD',
        shippingCost: 10,
        taxAmount: 5,
        competitorPrice: 120,
        strategy: 'match_competitor',
      });

      expect(result.ourPrice).toBe(120);
    });
  });

  describe('selectStrategy', () => {
    it('returns minimum_margin when no competitor', () => {
      expect(selectStrategy(false, 100)).toBe('minimum_margin');
    });

    it('returns competitor_minus_1 when competitor is much higher', () => {
      expect(selectStrategy(true, 80, 120)).toBe('competitor_minus_1');
    });

    it('returns match_competitor when competitor is close', () => {
      expect(selectStrategy(true, 80, 90)).toBe('match_competitor');
    });

    it('returns minimum_margin when competitor is below cost', () => {
      expect(selectStrategy(true, 80, 70)).toBe('minimum_margin');
    });
  });
});
