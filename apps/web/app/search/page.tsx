import { apiFetch } from '@/lib/api';

interface SearchResult {
  id: string;
  canonicalName: string;
  brandName?: string | null;
  bestPrice?: string | null;
}

interface SearchResponse {
  results: SearchResult[];
  total: number;
}

interface SearchPageProps {
  searchParams: Record<string, string | undefined>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const query = searchParams.q || '';

  let results: SearchResponse = { results: [], total: 0 };

  if (query) {
    try {
      results = await apiFetch<SearchResponse>(`/api/v1/search?q=${encodeURIComponent(query)}`);
    } catch {
      // Handle error
    }
  }

  return (
    <div className="space-y-6">
      <form className="flex gap-2">
        <input
          type="text"
          name="q"
          defaultValue={query}
          placeholder="Busca un producto..."
          className="flex-1 rounded-lg border px-4 py-3 focus:border-brand-500 focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-lg bg-brand-600 px-6 py-3 font-medium text-white hover:bg-brand-700"
        >
          Buscar
        </button>
      </form>

      {query && (
        <p className="text-sm text-gray-500">
          {results.total} resultados para &quot;{query}&quot;
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {results.results.map((product) => (
          <a
            key={product.id}
            href={`/products/${product.id}`}
            className="rounded-lg border p-4 hover:border-brand-500 hover:shadow-md"
          >
            <h3 className="font-medium">{product.canonicalName}</h3>
            {product.brandName && (
              <p className="text-sm text-gray-500">{product.brandName}</p>
            )}
            {product.bestPrice && (
              <p className="mt-2 text-lg font-bold text-brand-600">${product.bestPrice}</p>
            )}
          </a>
        ))}
      </div>
    </div>
  );
}
