import { db } from './client';
import { brands, categories, suppliers, products, supplierProducts, currentPrices } from './schema';
import { eq } from 'drizzle-orm';

async function seed() {
  console.log('Seeding database...');

  // Seed brands
  const brandData = [
    { name: 'Samsung', slug: 'samsung' },
    { name: 'Apple', slug: 'apple' },
    { name: 'Xiaomi', slug: 'xiaomi' },
    { name: 'Sony', slug: 'sony' },
    { name: 'LG', slug: 'lg' },
    { name: 'Nike', slug: 'nike' },
    { name: 'Adidas', slug: 'adidas' },
    { name: 'Nintendo', slug: 'nintendo' },
    { name: 'Logitech', slug: 'logitech' },
    { name: 'JBL', slug: 'jbl' },
  ];

  const insertedBrands: Record<string, string> = {};
  for (const brand of brandData) {
    const [b] = await db
      .insert(brands)
      .values(brand)
      .onConflictDoNothing({ target: brands.slug })
      .returning();
    if (b) insertedBrands[brand.slug] = b.id;
  }
  // Fetch existing brands if conflict
  const existingBrands = await db.select().from(brands);
  for (const b of existingBrands) insertedBrands[b.slug] = b.id;
  console.log(`Inserted ${brandData.length} brands`);

  // Seed categories
  const categoryData = [
    { name: 'Electrónicos', slug: 'electronicos', level: 0, sortOrder: 1 },
    { name: 'Celulares', slug: 'celulares', level: 1, sortOrder: 1 },
    { name: 'Laptops', slug: 'laptops', level: 1, sortOrder: 2 },
    { name: 'Audio', slug: 'audio', level: 1, sortOrder: 3 },
    { name: 'Accesorios', slug: 'accesorios', level: 0, sortOrder: 2 },
    { name: 'Ropa', slug: 'ropa', level: 0, sortOrder: 3 },
    { name: 'Hogar', slug: 'hogar', level: 0, sortOrder: 4 },
    { name: 'Gaming', slug: 'gaming', level: 0, sortOrder: 5 },
  ];

  for (const cat of categoryData) {
    await db
      .insert(categories)
      .values(cat)
      .onConflictDoNothing({ target: categories.slug });
  }
  console.log(`Inserted ${categoryData.length} categories`);

  // Seed suppliers
  const supplierData = [
    { name: 'AliExpress', slug: 'aliexpress', type: 'api' as const, config: { apiKey: '' } },
    { name: 'Amazon México', slug: 'amazon', type: 'api' as const, config: { apiKey: '' } },
    { name: 'Mercado Libre', slug: 'mercadolibre', type: 'api' as const, config: { apiKey: '' } },
    { name: 'eBay', slug: 'ebay', type: 'api' as const, config: { apiKey: '' } },
    { name: 'Walmart', slug: 'walmart', type: 'scraping' as const, config: {} },
    { name: 'SHEIN', slug: 'shein', type: 'scraping' as const, config: {} },
    { name: 'Temu', slug: 'temu', type: 'scraping' as const, config: {} },
    { name: 'TikTok Shop', slug: 'tiktokshop', type: 'scraping' as const, config: {} },
  ];

  const insertedSuppliers: Record<string, string> = {};
  for (const sup of supplierData) {
    const [s] = await db
      .insert(suppliers)
      .values(sup)
      .onConflictDoNothing({ target: suppliers.slug })
      .returning();
    if (s) insertedSuppliers[sup.slug] = s.id;
  }
  const existingSuppliers = await db.select().from(suppliers);
  for (const s of existingSuppliers) insertedSuppliers[s.slug] = s.id;
  console.log(`Inserted ${supplierData.length} suppliers`);

  // Seed test products with prices from multiple suppliers
  const testProducts = [
    {
      canonicalName: 'Apple AirPods Pro (2ª Gen) USB-C',
      slug: 'apple-airpods-pro-2g-usb-c',
      brandSlug: 'apple',
      suppliers: [
        { slug: 'amazon', supplierProductId: 'B0D1XD1ZV3', price: 3299, currency: 'MXN', shipping: 0, inStock: true },
        { slug: 'mercadolibre', supplierProductId: 'MLM26087594', price: 3499, currency: 'MXN', shipping: 0, inStock: true },
        { slug: 'aliexpress', supplierProductId: '1005006231398283', price: 1899, currency: 'MXN', shipping: 200, inStock: true },
      ],
    },
    {
      canonicalName: 'Samsung Galaxy S24 Ultra 256GB',
      slug: 'samsung-galaxy-s24-ultra-256gb',
      brandSlug: 'samsung',
      suppliers: [
        { slug: 'amazon', supplierProductId: 'B0CMDL3DPW', price: 24999, currency: 'MXN', shipping: 0, inStock: true },
        { slug: 'mercadolibre', supplierProductId: 'MLM3679384021', price: 23499, currency: 'MXN', shipping: 0, inStock: true },
      ],
    },
    {
      canonicalName: 'Nintendo Switch OLED Blanca',
      slug: 'nintendo-switch-oled-blanca',
      brandSlug: 'nintendo',
      suppliers: [
        { slug: 'amazon', supplierProductId: 'B098RKWHJZ', price: 6499, currency: 'MXN', shipping: 0, inStock: true },
        { slug: 'mercadolibre', supplierProductId: 'MLM2194856034', price: 6299, currency: 'MXN', shipping: 0, inStock: true },
        { slug: 'walmart', supplierProductId: 'SW12345678', price: 6999, currency: 'MXN', shipping: 0, inStock: true },
      ],
    },
    {
      canonicalName: 'JBL Tune 770NC Auriculares Bluetooth',
      slug: 'jbl-tune-770nc',
      brandSlug: 'jbl',
      suppliers: [
        { slug: 'amazon', supplierProductId: 'B0CX23V2ZK', price: 1499, currency: 'MXN', shipping: 0, inStock: true },
        { slug: 'aliexpress', supplierProductId: '1005006812345678', price: 899, currency: 'MXN', shipping: 150, inStock: true },
      ],
    },
    {
      canonicalName: 'Logitech MX Master 3S Mouse',
      slug: 'logitech-mx-master-3s',
      brandSlug: 'logitech',
      suppliers: [
        { slug: 'amazon', supplierProductId: 'B09HM94VDS', price: 1899, currency: 'MXN', shipping: 0, inStock: true },
        { slug: 'walmart', supplierProductId: 'SW87654321', price: 1999, currency: 'MXN', shipping: 0, inStock: true },
      ],
    },
  ];

  for (const tp of testProducts) {
    const brandId = insertedBrands[tp.brandSlug] || null;

    const [product] = await db
      .insert(products)
      .values({
        canonicalName: tp.canonicalName,
        slug: tp.slug,
        brandId,
        isActive: true,
      })
      .onConflictDoNothing({ target: products.slug })
      .returning();

    const existingProduct = await db.select().from(products).where(eq(products.slug, tp.slug)).limit(1);
    const productId = product?.id || existingProduct[0]?.id;
    if (!productId) continue;

    for (const sp of tp.suppliers) {
      const supplierId = insertedSuppliers[sp.slug];
      if (!supplierId) continue;

      const [spRecord] = await db
        .insert(supplierProducts)
        .values({
          supplierId,
          supplierProductId: sp.supplierProductId,
          productId,
          matchConfidence: '1.00',
          matchType: 'exact',
        })
        .onConflictDoNothing()
        .returning();

      const existingSP = await db.select().from(supplierProducts)
        .where(eq(supplierProducts.supplierProductId, sp.supplierProductId))
        .limit(1);
      const spId = spRecord?.id || existingSP[0]?.id;
      if (!spId) continue;

      const finalPrice = sp.price + sp.shipping;
      await db.insert(currentPrices).values({
        supplierProductId: spId,
        price: sp.price.toString(),
        currency: sp.currency,
        shippingCost: sp.shipping.toString(),
        finalPrice: finalPrice.toString(),
        inStock: sp.inStock,
      }).onConflictDoNothing();
    }
  }
  console.log(`Inserted ${testProducts.length} test products with prices`);

  console.log('Seed complete!');
}

seed().catch(console.error);
