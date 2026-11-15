'use client';

import { useEffect, useState } from 'react';
import { useAuthStore, useModuleStore } from '@/hooks';
import { supabase } from '@/lib/db/supabase';
import { lowStockSchema, type LowStockSummary } from '@/lib/lowStock';
import { recentPurchasesSchema, purchaseStatusLabel, type RecentPurchases } from '@/lib/purchases';
import { TrendingUp, Package, Users, DollarSign } from 'lucide-react';
import Link from 'next/link';

async function fetchSummary(path: string): Promise<unknown> {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session?.access_token) throw new Error('No se pudo obtener la sesión. Inicia sesión nuevamente.');
  const response = await fetch(path, {
    headers: { Authorization: `Bearer ${session.access_token}` },
    cache: 'no-store',
  });
  const result: unknown = await response.json();
  const payload = result !== null && typeof result === 'object' ? result as Record<string, unknown> : null;
  if (!response.ok) {
    throw new Error(typeof payload?.error === 'string' && payload.error ? payload.error : 'No se pudo consultar el resumen.');
  }
  return result;
}

function SummaryMetric({ path, field, description }: { path: string; field: string; description: string }) {
  const [summary, setSummary] = useState<{ count: number | null; error: string }>({ count: null, error: '' });
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let active = true;
    async function loadSummary() {
      try {
        const result = await fetchSummary(path);
        const payload = result !== null && typeof result === 'object' ? result as Record<string, unknown> : null;
        const count = payload?.[field];
        if (typeof count !== 'number' || !Number.isSafeInteger(count) || count < 0) {
          throw new Error('El resumen recibido no es válido.');
        }
        if (active) setSummary({ count, error: '' });
      } catch (error) {
        if (active) setSummary({ count: null, error: error instanceof Error ? error.message : 'No se pudo consultar el resumen.' });
      }
    }
    void loadSummary();
    return () => { active = false; };
  }, [path, field, revision]);

  return <>
    <p className="text-2xl font-bold text-gray-900 mt-1" aria-live="polite">
      {summary.error ? 'No disponible' : summary.count === null ? 'Cargando...' : summary.count}
    </p>
    {summary.error ? <div role="alert" className="mt-2 text-sm text-red-700">
      <p>{summary.error}</p>
      <button type="button" className="underline" onClick={() => {
        setSummary({ count: null, error: '' }); setRevision((value) => value + 1);
      }}>Reintentar</button>
    </div> : <p className="mt-2 text-sm text-gray-600">{description}</p>}
  </>;
}

function LowStock() {
  const [summary, setSummary] = useState<LowStockSummary | null>(null);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const result = lowStockSchema.safeParse(await fetchSummary('/api/inventario/bajo-stock'));
        if (!result.success) throw new Error('El resumen de bajo stock no es válido.');
        if (active) setSummary(result.data);
      } catch (error) {
        if (active) setError(error instanceof Error ? error.message : 'No se pudo consultar el bajo stock.');
      }
    }
    void load();
    return () => { active = false; };
  }, [revision]);

  if (error) return <div role="alert" className="text-sm text-red-700">
    <p>{error}</p>
    <button type="button" className="underline" onClick={() => {
      setError(''); setSummary(null); setRevision((value) => value + 1);
    }}>Reintentar</button>
  </div>;
  if (!summary) return <p className="text-sm text-gray-600" aria-live="polite">Cargando...</p>;

  return <div className="space-y-3 text-sm">
    <p className="text-gray-600">
      Productos activos cuya existencia física es igual o inferior a su nivel de reposición; no se descuentan reservas.
    </p>
    <p className="text-gray-700">
      {summary.total === 0 ? 'No hay productos con bajo stock evaluados.' :
        `${summary.total} producto(s) con bajo stock${summary.total > 5 ? '; se muestran los 5 con menor existencia física' : ''}.`}
    </p>
    {summary.items.length > 0 && <ul className="divide-y divide-gray-200">
      {summary.items.map((item) => <li key={item.id} className="py-2">
        <p className="font-medium text-gray-900">{item.name} ({item.product_code})</p>
        <p className="text-gray-600">Existencia física: {item.quantity_on_hand} · Nivel de reposición: {item.reorder_level}</p>
      </li>)}
    </ul>}
    {summary.not_evaluated > 0 && <p className="text-amber-700">
      {summary.not_evaluated} producto(s) sin evaluar por existencia o nivel de reposición sin registrar o inválidos.
    </p>}
    <Link href="/dashboard/inventario" className="text-blue-700 underline">Ver inventario</Link>
  </div>;
}

function RecentOrders() {
  const [orders, setOrders] = useState<RecentPurchases | null>(null);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const result = await fetchSummary('/api/compras/recientes');
        const payload = result !== null && typeof result === 'object' ? result as Record<string, unknown> : null;
        const parsed = recentPurchasesSchema.safeParse(payload?.items);
        if (!parsed.success) throw new Error('Las compras recientes recibidas no son válidas.');
        if (active) setOrders(parsed.data);
      } catch (error) {
        if (active) setError(error instanceof Error ? error.message : 'No se pudieron consultar las compras recientes.');
      }
    }
    void load();
    return () => { active = false; };
  }, [revision]);

  if (error) return <div role="alert" className="text-sm text-red-700">
    <p>{error}</p>
    <button type="button" className="underline" onClick={() => {
      setError(''); setOrders(null); setRevision((value) => value + 1);
    }}>Reintentar</button>
  </div>;
  if (!orders) return <p className="text-sm text-gray-600" aria-live="polite">Cargando...</p>;

  return <div className="space-y-3 text-sm">
    <p className="text-gray-600">Hasta cinco órdenes, ordenadas por fecha de registro.</p>
    {orders.length === 0 ? <p className="text-gray-700">No hay órdenes de compra registradas.</p> :
      <ul className="divide-y divide-gray-200">
        {orders.map((order) => <li key={order.id} className="py-2">
          <p className="font-medium text-gray-900">{order.po_number}</p>
          <p className="text-gray-600">Fecha de orden: {order.order_date} · Estado: {purchaseStatusLabel(order.status)}</p>
        </li>)}
      </ul>}
    <Link href="/dashboard/compras" className="text-blue-700 underline">Ver compras</Link>
  </div>;
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const canViewInventory = useModuleStore((state) => state.userModules.some(
    (item) => item.module?.name === 'inventory' && item.module.is_active && item.can_view
  ));
  const canViewCustomers = useModuleStore((state) => state.userModules.some(
    (item) => item.module?.name === 'clients' && item.module.is_active && item.can_view
  ));
  const canViewPurchases = useModuleStore((state) => state.userModules.some(
    (item) => item.module?.name === 'purchases' && item.module.is_active && item.can_view
  ));

  const stats = [
    {
      title: 'Ventas del Mes',
      icon: TrendingUp,
      color: 'blue',
    },
    {
      title: 'Productos activos con existencias',
      icon: Package,
      color: 'green',
      summary: {
        allowed: canViewInventory,
        path: '/api/inventario/resumen',
        field: 'products_in_stock',
        description: 'Existencia física registrada mayor que cero; no incluye productos sin conteo.',
      },
    },
    {
      title: 'Clientes Activos',
      icon: Users,
      color: 'purple',
      summary: {
        allowed: canViewCustomers,
        path: '/api/clientes/resumen',
        field: 'active_customers',
        description: 'Clientes registrados con estado activo.',
      },
    },
    {
      title: 'Ingresos Totales',
      icon: DollarSign,
      color: 'amber',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Bienvenido, {user?.full_name}
        </h1>
        <p className="text-gray-600 mt-1">
          Algunas métricas todavía no están disponibles.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          const colorClasses: Record<string, string> = {
            blue: 'bg-blue-50 text-blue-600',
            green: 'bg-green-50 text-green-600',
            purple: 'bg-purple-50 text-purple-600',
            amber: 'bg-amber-50 text-amber-600',
          };

          return (
            <div key={index} className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div
                  className={`${colorClasses[stat.color]} p-3 rounded-lg`}
                >
                  <Icon size={24} />
                </div>
              </div>
              <p className="text-gray-600 text-sm">{stat.title}</p>
              {stat.summary?.allowed ? <SummaryMetric {...stat.summary} /> :
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {stat.summary ? 'Sin permiso' : 'No disponible'}
                </p>}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Ventas Recientes</h2>
          <p className="text-sm text-gray-600">Datos reales aún no disponibles.</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Órdenes de compra recientes</h2>
          {canViewPurchases ? <RecentOrders /> : <p className="text-sm text-gray-600">Sin permiso para ver compras.</p>}
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            Productos con Bajo Stock
          </h2>
          {canViewInventory ? <LowStock /> : <p className="text-sm text-gray-600">Sin permiso para ver inventario.</p>}
        </div>
      </div>
    </div>
  );
}
