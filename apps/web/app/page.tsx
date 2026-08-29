export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center gap-8 py-20">
      <h1 className="text-5xl font-bold">
        Encuentra el <span className="text-brand-600">mejor precio</span>
      </h1>
      <p className="max-w-2xl text-center text-lg text-gray-600">
        Pega un enlace de TikTok, Amazon, AliExpress o cualquier tienda.
        <br />
        Nosotros encontramos si existe una forma más barata de conseguirlo.
      </p>
      <form className="flex w-full max-w-lg gap-2" action="/search">
        <input
          type="text"
          name="q"
          placeholder="Pega un enlace o busca un producto..."
          className="flex-1 rounded-lg border px-4 py-3 focus:border-brand-500 focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-lg bg-brand-600 px-6 py-3 font-medium text-white hover:bg-brand-700"
        >
          Buscar
        </button>
      </form>
      <div className="flex gap-4 text-sm text-gray-500">
        <span>TikTok Shop</span>
        <span>Amazon</span>
        <span>AliExpress</span>
        <span>Mercado Libre</span>
      </div>
    </div>
  );
}
