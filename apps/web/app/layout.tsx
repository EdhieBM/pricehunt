import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PriceHunt - Encuentra el mejor precio',
  description:
    'La plataforma que encuentra para ti el mejor precio en productos de múltiples tiendas.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <header className="border-b">
          <nav className="container mx-auto flex items-center justify-between px-4 py-3">
            <a href="/" className="text-2xl font-bold text-brand-600">
              PriceHunt
            </a>
            <div className="flex items-center gap-4">
              <a href="/search" className="hover:text-brand-600">
                Buscar
              </a>
              <a href="/orders" className="hover:text-brand-600">
                Mis Pedidos
              </a>
            </div>
          </nav>
        </header>
        <main className="container mx-auto px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
