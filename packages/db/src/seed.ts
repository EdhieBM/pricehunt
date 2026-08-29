import { db } from './client';
import { brands, categories, suppliers } from './schema';

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

  for (const brand of brandData) {
    await db
      .insert(brands)
      .values(brand)
      .onConflictDoNothing({ target: brands.slug });
  }
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
    {
      name: 'AliExpress',
      slug: 'aliexpress',
      type: 'api',
      config: { apiKey: '' },
    },
    {
      name: 'Amazon México',
      slug: 'amazon',
      type: 'api',
      config: { apiKey: '' },
    },
    {
      name: 'Mercado Libre',
      slug: 'mercadolibre',
      type: 'api',
      config: { apiKey: '' },
    },
  ];

  for (const sup of supplierData) {
    await db
      .insert(suppliers)
      .values(sup)
      .onConflictDoNothing({ target: suppliers.slug });
  }
  console.log(`Inserted ${supplierData.length} suppliers`);

  console.log('Seed complete!');
}

seed().catch(console.error);
