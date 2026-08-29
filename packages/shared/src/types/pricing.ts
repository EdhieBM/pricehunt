export type PricingStrategy =
  | 'auto'
  | 'competitor_minus_1'
  | 'competitor_percent'
  | 'minimum_margin'
  | 'match_competitor'
  | 'dynamic'
  | 'controlled_negative';

export interface PricingInput {
  supplierCost: number;
  shippingCost: number;
  taxAmount: number;
  fees: number;
  competitorPrice?: number;
  strategy: PricingStrategy;
  minMarginPercentage?: number;
  maxLossPercentage?: number;
}

export interface PricingResult {
  supplierCost: number;
  shippingCost: number;
  taxAmount: number;
  fees: number;
  totalCost: number;
  ourPrice: number;
  margin: number;
  marginPercentage: number;
  strategyUsed: PricingStrategy;
  competitorPrice: number | null;
  savingsVsCompetitor: number | null;
  explanation: PriceExplanation;
}

export interface PriceExplanation {
  timestamp: string;
  source: string;
  supplier: string;
  productPrice: number;
  shipping: number;
  tax: number;
  fees: number;
  exchangeRate: number;
  finalCost: number;
  competitorPrice: number | null;
  ourPrice: number;
  pricingRule: string;
  algorithmVersion: string;
}

export interface Offer {
  id: string;
  productId: string;
  variantId: string | null;
  supplierProductId: string;
  supplierName: string;
  ourPrice: number;
  ourMargin: number;
  marginPercentage: number;
  score: number;
  priceScore: number;
  deliveryScore: number;
  reliabilityScore: number;
  matchScore: number;
  isBestOffer: boolean;
  shippingCost: number;
  totalLandedCost: number;
  deliveryDays: number | null;
  inStock: boolean;
}
