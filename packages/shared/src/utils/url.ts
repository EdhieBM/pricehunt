export type SupplierSlug =
  | 'aliexpress'
  | 'amazon'
  | 'mercadolibre'
  | 'ebay'
  | 'walmart'
  | 'shein'
  | 'temu'
  | 'costco'
  | 'liverpool'
  | 'palacio'
  | 'tiktokshop'
  | 'facebook'
  | 'rappi'
  | 'didi'
  | 'shopify'
  | 'homedepot'
  | 'officedepot'
  | 'sears'
  | 'coppel'
  | 'sanborns';

interface ParsedUrl {
  supplier: SupplierSlug;
  productId: string;
  originalUrl: string;
}

const SUPPLIER_PATTERNS: {
  supplier: SupplierSlug;
  domains: RegExp[];
  extractProductId: (url: string, match: RegExpMatchArray) => string | null;
}[] = [
  {
    supplier: 'aliexpress',
    domains: [
      /^https?:\/\/(?:www\.)?aliexpress\.com\/item\/(\d+)\.html/,
      /^https?:\/\/(?:www\.)?aliexpress\.us\/item\/(\d+)\.html/,
      /^https?:\/\/(?:www\.)?aliexpress\.com\/.*?\/item\/(\d+)\.html/,
      /^https?:\/\/(?:www\.)?aliexpress\.com\/.*?\/(\d+)\.html/,
      /^https?:\/\/a\.aliexpress\.com\/.+/,
    ],
    extractProductId: (url: string, match: RegExpMatchArray): string | null => {
      if (match[1]) return match[1];
      const idMatch = url.match(/\/(\d{10,})\.html/);
      return idMatch?.[1] ?? null;
    },
  },
  {
    supplier: 'amazon',
    domains: [
      /^https?:\/\/(?:www\.)?amazon\.com\.mx\/(?:.*?\/)?dp\/([A-Z0-9]{10})/,
      /^https?:\/\/(?:www\.)?amazon\.com\/(?:.*?\/)?dp\/([A-Z0-9]{10})/,
      /^https?:\/\/(?:www\.)?amazon\.com\.mx\/(?:.*?\/)?gp\/product\/([A-Z0-9]{10})/,
      /^https?:\/\/(?:www\.)?amazon\.com\/(?:.*?\/)?gp\/product\/([A-Z0-9]{10})/,
      /^https?:\/\/amzn\.to\/.+/,
    ],
    extractProductId: (url: string, match: RegExpMatchArray): string | null => {
      if (match[1]) return match[1];
      const dpMatch = url.match(/\/dp\/([A-Z0-9]{10})/);
      if (dpMatch) return dpMatch[1] ?? null;
      const gpMatch = url.match(/\/gp\/product\/([A-Z0-9]{10})/);
      return gpMatch?.[1] ?? null;
    },
  },
  {
    supplier: 'mercadolibre',
    domains: [
      /^https?:\/\/(?:www\.)?mercadolibre\.com\.mx\/.*?\/(MLM-\d+)/,
      /^https?:\/\/(?:www\.)?mercadolibre\.com\.mx\/.*?\/p\/(MLM\d+)/,
      /^https?:\/\/(?:www\.)?mercadolibre\.com\.ar\/.*?\/(MLA-\d+)/,
      /^https?:\/\/(?:www\.)?mercadolibre\.com\.ar\/.*?\/p\/(MLA\d+)/,
      /^https?:\/\/(?:www\.)?mercadolibre\.com\.br\/.*?\/(MLB-\d+)/,
      /^https?:\/\/(?:www\.)?mercadolibre\.com\.br\/.*?\/p\/(MLB\d+)/,
      /^https?:\/\/(?:www\.)?mercadolibre\.com\.co\/.*?\/(MCO-\d+)/,
      /^https?:\/\/(?:www\.)?mercadolibre\.com\.cl\/.*?\/(MLC-\d+)/,
      /^https?:\/\/(?:www\.)?mercadolibre\.com\.pe\/.*?\/(MPE-\d+)/,
      /^https?:\/\/(?:www\.)?mercadolibre\.com\.uy\/.*?\/(MLU-\d+)/,
      /^https?:\/\/articulo\.mercadolibre\.com\.mx\/(MLM-\d+)/,
      /^https?:\/\/produto\.mercadolibre\.com\.br\/(MLB-\d+)/,
    ],
    extractProductId: (_url: string, match: RegExpMatchArray): string | null => {
      return match[1] || null;
    },
  },
  {
    supplier: 'ebay',
    domains: [
      /^https?:\/\/(?:www\.)?ebay\.com\.mx\/itm\/(\d+)/,
      /^https?:\/\/(?:www\.)?ebay\.com\/itm\/(\d+)/,
      /^https?:\/\/(?:www\.)?ebay\.ca\/itm\/(\d+)/,
      /^https?:\/\/(?:www\.)?ebay\.co\.uk\/itm\/(\d+)/,
    ],
    extractProductId: (_url: string, match: RegExpMatchArray): string | null => {
      return match[1] || null;
    },
  },
  {
    supplier: 'walmart',
    domains: [
      /^https?:\/\/(?:www\.)?walmart\.com\.mx\/ip\/([^/]+)/,
      /^https?:\/\/(?:www\.)?walmart\.com\/ip\/([^/]+)/,
    ],
    extractProductId: (_url: string, match: RegExpMatchArray): string | null => {
      return match[1] || null;
    },
  },
  {
    supplier: 'shein',
    domains: [
      /^https?:\/\/(?:www\.)?shein\.com\.mx\/.*?-p-(\d+)\.html/,
      /^https?:\/\/(?:www\.)?shein\.com\/.*?-p-(\d+)\.html/,
    ],
    extractProductId: (_url: string, match: RegExpMatchArray): string | null => {
      return match[1] || null;
    },
  },
  {
    supplier: 'temu',
    domains: [
      /^https?:\/\/(?:www\.)?temu\.com\.mx\/.*?-goods-(\d+)\.html/,
      /^https?:\/\/(?:www\.)?temu\.com\/.*?-goods-(\d+)\.html/,
    ],
    extractProductId: (_url: string, match: RegExpMatchArray): string | null => {
      return match[1] || null;
    },
  },
  {
    supplier: 'tiktokshop',
    domains: [
      /^https?:\/\/(?:www\.)?tiktok\.com\/@[^/]+\/video\/(\d+)/,
      /^https?:\/\/(?:www\.)?tiktok\.com\/search\?.*q=/,
      /^https?:\/\/vm\.tiktok\.com\/.+/,
    ],
    extractProductId: (url: string, match: RegExpMatchArray): string | null => {
      if (match[1]) return match[1];
      const idMatch = url.match(/\/video\/(\d+)/);
      return idMatch?.[1] || null;
    },
  },
];

const SUPPLIER_DOMAIN_MAP: Record<string, SupplierSlug> = {
  'aliexpress.com': 'aliexpress',
  'aliexpress.us': 'aliexpress',
  'a.aliexpress.com': 'aliexpress',
  'amazon.com': 'amazon',
  'amazon.com.mx': 'amazon',
  'amzn.to': 'amazon',
  'mercadolibre.com.mx': 'mercadolibre',
  'mercadolibre.com.ar': 'mercadolibre',
  'mercadolibre.com.br': 'mercadolibre',
  'mercadolibre.com.co': 'mercadolibre',
  'mercadolibre.com.cl': 'mercadolibre',
  'mercadolibre.com.pe': 'mercadolibre',
  'mercadolibre.com.uy': 'mercadolibre',
  'articulo.mercadolibre.com.mx': 'mercadolibre',
  'produto.mercadolibre.com.br': 'mercadolibre',
  'ebay.com': 'ebay',
  'ebay.com.mx': 'ebay',
  'ebay.ca': 'ebay',
  'ebay.co.uk': 'ebay',
  'walmart.com': 'walmart',
  'walmart.com.mx': 'walmart',
  'shein.com': 'shein',
  'shein.com.mx': 'shein',
  'temu.com': 'temu',
  'temu.com.mx': 'temu',
  'tiktok.com': 'tiktokshop',
  'vm.tiktok.com': 'tiktokshop',
};

export function detectSupplierFromUrl(url: string): SupplierSlug | null {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');
    return SUPPLIER_DOMAIN_MAP[hostname] || null;
  } catch {
    return null;
  }
}

export function parseProductUrl(url: string): ParsedUrl | null {
  const cleaned = url.trim();

  for (const pattern of SUPPLIER_PATTERNS) {
    for (const domainPattern of pattern.domains) {
      const match = cleaned.match(domainPattern);
      if (match) {
        const productId = pattern.extractProductId(cleaned, match);
        if (productId) {
          return {
            supplier: pattern.supplier,
            productId,
            originalUrl: cleaned,
          };
        }
      }
    }
  }

  const supplier = detectSupplierFromUrl(cleaned);
  if (supplier) {
    return { supplier, productId: '', originalUrl: cleaned };
  }

  return null;
}

export function isSupportedSupplierUrl(url: string): boolean {
  return parseProductUrl(url) !== null;
}

export function getSupplierName(supplier: SupplierSlug): string {
  const names: Record<SupplierSlug, string> = {
    aliexpress: 'AliExpress',
    amazon: 'Amazon',
    mercadolibre: 'Mercado Libre',
    ebay: 'eBay',
    walmart: 'Walmart',
    shein: 'SHEIN',
    temu: 'Temu',
    costco: 'Costco',
    liverpool: 'Liverpool',
    palacio: 'Palacio de Hierro',
    tiktokshop: 'TikTok Shop',
    facebook: 'Facebook Marketplace',
    rappi: 'Rappi',
    didi: 'DiDi Store',
    shopify: 'Shopify Stores',
    homedepot: 'Home Depot',
    officedepot: 'Office Depot',
    sears: 'Sears',
    coppel: 'Coppel',
    sanborns: 'Sanborns',
  };
  return names[supplier];
}
