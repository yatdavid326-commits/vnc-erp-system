'use client';

import Link from 'next/link';
import { ChevronRight, House } from 'lucide-react';
import { usePathname } from 'next/navigation';

const routeLabels: Record<string, string> = {
  dashboard: 'Panel',
  pos: 'Punto de Venta',
  inventario: 'Inventario',
  caja: 'Caja',
  clientes: 'Clientes',
  proveedores: 'Proveedores',
  compras: 'Compras',
  empleados: 'Empleados',
  asistencia: 'Asistencia',
  reportes: 'Reportes',
  permisos: 'Roles y Permisos',
  settings: 'Configuración',
};

export default function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) return null;

  return (
    <nav aria-label="Migas de navegación" className="mb-3 flex min-w-0 items-center gap-1 text-xs text-gray-500">
      <Link href="/dashboard" className="flex shrink-0 items-center gap-1 hover:text-gray-800">
        <House size={13} aria-hidden="true" />
        <span className="sr-only sm:not-sr-only">Inicio</span>
      </Link>
      {segments.slice(1).map((segment, index, visibleSegments) => {
        const href = `/${segments.slice(0, index + 2).join('/')}`;
        const label = routeLabels[segment] ?? segment;
        const last = index === visibleSegments.length - 1;
        return (
          <span key={`${segment}-${index}`} className="flex min-w-0 items-center gap-1">
            <ChevronRight size={12} aria-hidden="true" />
            {last ? (
              <span aria-current="page" className="truncate font-medium text-gray-700">{label}</span>
            ) : (
              <Link href={href} className="truncate hover:text-gray-800">{label}</Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
