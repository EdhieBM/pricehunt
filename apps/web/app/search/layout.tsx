import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Buscar Productos - PriceHunt',
  description: 'Busca productos y encuentra el mejor precio',
};

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
