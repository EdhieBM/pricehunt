import type { PricingStrategy } from '@pricehunt/shared';

export interface PricingInput {
  supplierCost: number;
  currency: string;
  shippingCost: number;
  taxAmount: number;
  competitorPrice?: number;
  strategy: PricingStrategy;
  minMarginPercentage?: number;
}

export interface PricingResult {
  ourPrice: number;
  margin: number;
  marginPercentage: number;
  strategy: PricingStrategy;
  explanation: string;
}

const DEFAULT_MIN_MARGIN = 0.02;

export function calculatePrice(input: PricingInput): PricingResult {
  const landedCost = input.supplierCost + input.shippingCost + input.taxAmount;
  const minMargin = input.minMarginPercentage ?? DEFAULT_MIN_MARGIN;
  const minPrice = landedCost * (1 + minMargin);

  switch (input.strategy) {
    case 'competitor_minus_1':
      return calculateCompetitorMinus1(input, landedCost, minPrice, minMargin);

    case 'competitor_percent':
      return calculateCompetitorPercent(input, landedCost, minPrice, minMargin);

    case 'match_competitor':
      return calculateMatchCompetitor(input, landedCost, minPrice, minMargin);

    case 'minimum_margin':
    case 'auto':
    default:
      return calculateMinimumMargin(landedCost, minMargin);
  }
}

function calculateMinimumMargin(
  landedCost: number,
  minMargin: number,
): PricingResult {
  const ourPrice = Math.ceil(landedCost * (1 + minMargin) * 100) / 100;
  const margin = ourPrice - landedCost;
  const marginPercentage = landedCost > 0 ? margin / ourPrice : 0;

  return {
    ourPrice,
    margin,
    marginPercentage,
    strategy: 'minimum_margin',
    explanation: `Applied minimum margin of ${(minMargin * 100).toFixed(1)}% to landed cost of ${landedCost.toFixed(2)}`,
  };
}

function calculateCompetitorMinus1(
  input: PricingInput,
  landedCost: number,
  minPrice: number,
  minMargin: number,
): PricingResult {
  if (!input.competitorPrice || input.competitorPrice <= 0) {
    return calculateMinimumMargin(landedCost, minMargin);
  }

  const competitorPrice = input.competitorPrice;
  let ourPrice = competitorPrice - 1;

  if (ourPrice < minPrice) {
    ourPrice = minPrice;
  }

  ourPrice = Math.ceil(ourPrice * 100) / 100;
  const margin = ourPrice - landedCost;
  const marginPercentage = landedCost > 0 ? margin / ourPrice : 0;

  return {
    ourPrice,
    margin,
    marginPercentage,
    strategy: 'competitor_minus_1',
    explanation: `Set $1 below competitor price of ${competitorPrice.toFixed(2)}, min price was ${minPrice.toFixed(2)}`,
  };
}

function calculateCompetitorPercent(
  input: PricingInput,
  landedCost: number,
  minPrice: number,
  minMargin: number,
): PricingResult {
  if (!input.competitorPrice || input.competitorPrice <= 0) {
    return calculateMinimumMargin(landedCost, minMargin);
  }

  const competitorPrice = input.competitorPrice;
  let ourPrice = competitorPrice * 0.97;

  if (ourPrice < minPrice) {
    ourPrice = minPrice;
  }

  ourPrice = Math.ceil(ourPrice * 100) / 100;
  const margin = ourPrice - landedCost;
  const marginPercentage = landedCost > 0 ? margin / ourPrice : 0;

  return {
    ourPrice,
    margin,
    marginPercentage,
    strategy: 'competitor_percent',
    explanation: `Set 3% below competitor price of ${competitorPrice.toFixed(2)}`,
  };
}

function calculateMatchCompetitor(
  input: PricingInput,
  landedCost: number,
  minPrice: number,
  minMargin: number,
): PricingResult {
  if (!input.competitorPrice || input.competitorPrice <= 0) {
    return calculateMinimumMargin(landedCost, minMargin);
  }

  const competitorPrice = input.competitorPrice;
  let ourPrice: number;

  if (competitorPrice >= minPrice) {
    ourPrice = competitorPrice;
  } else {
    ourPrice = minPrice;
  }

  ourPrice = Math.ceil(ourPrice * 100) / 100;
  const margin = ourPrice - landedCost;
  const marginPercentage = landedCost > 0 ? margin / ourPrice : 0;

  return {
    ourPrice,
    margin,
    marginPercentage,
    strategy: 'match_competitor',
    explanation: `Matched competitor price of ${competitorPrice.toFixed(2)}`,
  };
}

export function selectStrategy(
  hasCompetitor: boolean,
  ourCost: number,
  competitorPrice?: number,
): PricingStrategy {
  if (!hasCompetitor || !competitorPrice) {
    return 'minimum_margin';
  }

  if (competitorPrice > ourCost * 1.10) {
    return 'competitor_minus_1';
  }

  if (competitorPrice >= ourCost) {
    return 'match_competitor';
  }

  return 'minimum_margin';
}
