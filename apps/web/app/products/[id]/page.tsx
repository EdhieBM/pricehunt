import { apiFetch } from '@/lib/api';

interface ProductPageProps {
  params: { id: string };
}

interface ProductData {
  canonicalName: string;
  brand?: { name: string } | null;
  description?: string | null;
  images?: { url: string; altText?: string | null }[];
  bestOffer?: { ourPrice: number; supplier?: { name: string } | null } | null;
  variants?: { id: string; name?: string | null; sku?: string | null }[];
}

export default async function ProductPage({ params }: ProductPageProps) {
  const product = await apiFetch<ProductData>(`/api/v1/products/${params.id}`);

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div>
        {product.images?.[0] && (
          <img
            src={product.images[0].url}
            alt={product.images[0].altText || product.canonicalName}
            className="w-full rounded-lg"
          />
        )}
      </div>

      <div className="space-y-4">
        <h1 className="text-3xl font-bold">{product.canonicalName}</h1>
        {product.brand && <p className="text-gray-500">{product.brand.name}</p>}
        {product.description && <p className="text-gray-600">{product.description}</p>}

        {product.bestOffer && (
          <div className="rounded-lg border-2 border-brand-500 p-4">
            <p className="text-sm text-gray-500">Mejor precio encontrado</p>
            <p className="text-3xl font-bold text-brand-600">${product.bestOffer.ourPrice}</p>
            {product.bestOffer.supplier && (
              <p className="text-sm text-gray-500">
                vía {product.bestOffer.supplier.name}
              </p>
            )}
            <button className="mt-4 w-full rounded-lg bg-brand-600 py-3 font-medium text-white hover:bg-brand-700">
              Comprar ahora
            </button>
          </div>
        )}

        {product.variants && product.variants.length > 0 && (
          <div>
            <h3 className="font-medium">Variantes</h3>
            <div className="flex gap-2">
              {product.variants.map((variant) => (
                <button
                  key={variant.id}
                  className="rounded border px-3 py-1 text-sm hover:border-brand-500"
                >
                  {variant.name || variant.sku}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
