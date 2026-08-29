import type { MatchType } from '@pricehunt/shared';

export interface MatchFactors {
  textScore: number;
  brandScore: number;
  gtinScore: number;
  attributeScore: number;
}

export interface MatchResult {
  confidence: number;
  type: MatchType;
  factors: MatchFactors;
}

const WEIGHTS = {
  text: 0.35,
  brand: 0.20,
  gtin: 0.30,
  attributes: 0.15,
} as const;

const THRESHOLDS = {
  exact: 0.95,
  high: 0.85,
  review: 0.60,
} as const;

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(text: string): string[] {
  return normalizeText(text).split(' ').filter((t) => t.length > 1);
}

function jaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
  if (setA.size === 0 && setB.size === 0) return 1;
  const intersection = new Set([...setA].filter((x) => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return union.size === 0 ? 0 : intersection.size / union.size;
}

function calculateTextScore(titleA: string, titleB: string): number {
  const tokensA = new Set(tokenize(titleA));
  const tokensB = new Set(tokenize(titleB));
  return jaccardSimilarity(tokensA, tokensB);
}

function calculateBrandScore(
  brandA: string | null,
  brandB: string | null,
): number {
  if (!brandA || !brandB) return 0.5;
  return normalizeText(brandA) === normalizeText(brandB) ? 1.0 : 0.0;
}

function calculateGtinScore(
  gtinA: string | null,
  gtinB: string | null,
): number {
  if (!gtinA || !gtinB) return 0;
  return gtinA === gtinB ? 1.0 : 0;
}

function calculateAttributeScore(
  attrsA: Record<string, unknown>,
  attrsB: Record<string, unknown>,
): number {
  const keysA = Object.keys(attrsA);
  const keysB = Object.keys(attrsB);
  const allKeys = new Set([...keysA, ...keysB]);

  if (allKeys.size === 0) return 0.5;

  let matches = 0;
  let compared = 0;

  for (const key of allKeys) {
    if (key in attrsA && key in attrsB) {
      compared++;
      const valA = String(attrsA[key]).toLowerCase();
      const valB = String(attrsB[key]).toLowerCase();
      if (valA === valB) matches++;
    }
  }

  return compared === 0 ? 0.5 : matches / compared;
}

function classifyMatch(confidence: number): MatchType {
  if (confidence >= THRESHOLDS.exact) return 'exact';
  if (confidence >= THRESHOLDS.high) return 'equivalent';
  if (confidence >= THRESHOLDS.review) return 'similar';
  return 'unknown';
}

export function calculateMatch(
  productA: {
    title: string;
    brand: string | null;
    gtin: string | null;
    attributes: Record<string, unknown>;
  },
  productB: {
    title: string;
    brand: string | null;
    gtin: string | null;
    attributes: Record<string, unknown>;
  },
): MatchResult {
  const gtinScore = calculateGtinScore(productA.gtin, productB.gtin);

  if (gtinScore === 1.0) {
    return {
      confidence: 1.0,
      type: 'exact',
      factors: {
        textScore: 1.0,
        brandScore: 1.0,
        gtinScore: 1.0,
        attributeScore: 1.0,
      },
    };
  }

  const textScore = calculateTextScore(productA.title, productB.title);
  const brandScore = calculateBrandScore(productA.brand, productB.brand);
  const attributeScore = calculateAttributeScore(
    productA.attributes,
    productB.attributes,
  );

  const confidence =
    WEIGHTS.text * textScore +
    WEIGHTS.brand * brandScore +
    WEIGHTS.gtin * gtinScore +
    WEIGHTS.attributes * attributeScore;

  const type = classifyMatch(confidence);

  return {
    confidence,
    type,
    factors: { textScore, brandScore, gtinScore, attributeScore },
  };
}

export function findBestMatch(
  target: {
    title: string;
    brand: string | null;
    gtin: string | null;
    attributes: Record<string, unknown>;
  },
  candidates: Array<{
    id: string;
    title: string;
    brand: string | null;
    gtin: string | null;
    attributes: Record<string, unknown>;
  }>,
): { candidateId: string; match: MatchResult } | null {
  let bestMatch: { candidateId: string; match: MatchResult } | null = null;

  for (const candidate of candidates) {
    const match = calculateMatch(target, candidate);
    if (!bestMatch || match.confidence > bestMatch.match.confidence) {
      bestMatch = { candidateId: candidate.id, match };
    }
  }

  return bestMatch;
}
