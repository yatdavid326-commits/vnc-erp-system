import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'VNC Systems - ERP',
  description: 'Sistema de Gestión Empresarial',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
