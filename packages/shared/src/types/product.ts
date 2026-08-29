export type UUID = string;

export interface Product {
  id: UUID;
  canonicalName: string;
  slug: string;
  brandId: UUID | null;
  categoryId: UUID | null;
  gtin: string | null;
  mpn: string | null;
  description: string | null;
  attributes: Record<string, unknown>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductVariant {
  id: UUID;
  productId: UUID;
  sku: string | null;
  name: string | null;
  attributes: Record<string, unknown>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductImage {
  id: UUID;
  productId: UUID;
  variantId: UUID | null;
  url: string;
  altText: string | null;
  width: number | null;
  height: number | null;
  fileSize: number | null;
  position: number;
  isPrimary: boolean;
  createdAt: Date;
}

export interface Brand {
  id: UUID;
  name: string;
  slug: string;
  logoUrl: string | null;
  createdAt: Date;
}

export interface Category {
  id: UUID;
  parentId: UUID | null;
  name: string;
  slug: string;
  level: number;
  sortOrder: number;
  createdAt: Date;
}

export type MatchType = 'exact' | 'variant' | 'equivalent' | 'similar' | 'unknown';

export interface SupplierProduct {
  id: UUID;
  supplierId: UUID;
  supplierProductId: string;
  productId: UUID | null;
  variantId: UUID | null;
  matchConfidence: number;
  matchType: MatchType;
  rawData: Record<string, unknown> | null;
  lastSyncedAt: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IdentifyProductInput {
  url?: string;
  imageUrl?: string;
  text?: string;
}

export interface IdentifiedProduct {
  id: UUID;
  canonicalName: string;
  description: string | null;
  brand: string | null;
  category: string | null;
  images: string[];
  source: string;
  sourceUrl: string;
  sourcePrice: { amount: number; currency: string } | null;
  attributes: Record<string, unknown>;
  matchConfidence: number;
}
