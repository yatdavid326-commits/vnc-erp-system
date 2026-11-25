import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from './providers';
import WebVitalsReporter from '@/components/monitoring/WebVitalsReporter';
import { Analytics } from '@vercel/analytics/next';

export const metadata: Metadata = {
  title: 'VNC Systems - ERP',
  description: 'Sistema de Gestión Empresarial',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col font-sans">
        <WebVitalsReporter />
        <Analytics />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
