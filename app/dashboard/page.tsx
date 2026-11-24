'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/hooks';
import { fetchJson } from '@/lib/utils/fetchJson';
import type { DashboardSummary } from '@/lib/validation/dashboardSummary';
import { TrendingUp, Package, Users, DollarSign, RefreshCw } from 'lucide-react';
import { getCachedValue, setCachedValue } from '@/lib/utils/clientCache';

export const dynamic = 'force-dynamic';

type DashboardRequestState =
  | { key: number; status: 'success'; summary: DashboardSummary }
  | { key: number; status: 'error'; error: string };

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [requestState, setRequestState] =
    useState<DashboardRequestState | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const isLoading = requestState?.key !== reloadKey;
  const summary =
    !isLoading && requestState?.status === 'success'
      ? requestState.summary
      : null;
  const error =
    !isLoading && requestState?.status === 'error'
      ? requestState.error
      : null;

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const cacheKey = 'dashboard:metrics';
    const cached = reloadKey === 0
      ? getCachedValue<DashboardSummary>(cacheKey)
      : undefined;

    if (cached) {
      setRequestState({ key: reloadKey, status: 'success', summary: cached });
      return () => {
        active = false;
        controller.abort();
      };
    }

    void fetchJson<DashboardSummary>(
      '/api/dashboard/metrics',
      'No se pudieron cargar las métricas del panel.',
      { signal: controller.signal }
    )
      .then((data) => {
        if (active) {
          setCachedValue(cacheKey, data, 30_000);
          setRequestState({ key: reloadKey, status: 'success', summary: data });
        }
      })
      .catch((requestError: unknown) => {
        if (controller.signal.aborted) return;
        if (active) {
          setRequestState({
            key: reloadKey,
            status: 'error',
            error:
              requestError instanceof Error
                ? requestError.message
                : 'No se pudieron cargar las métricas del panel.',
          });
        }
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [reloadKey]);

  const formatCurrency = (amount: number) =>
    `$${amount.toLocaleString('es-MX', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  const formatCount = (count: number) =>
    count.toLocaleString('es-MX');

  const stats = [
    {
      title: 'Ventas del Mes',
      value: summary ? formatCurrency(summary.salesThisMonth.amount) : '—',
      detail: summary
        ? `${formatCount(summary.salesThisMonth.count)} ventas completadas`
        : '',
      icon: TrendingUp,
      color: 'blue',
    },
    {
      title: 'Productos en Stock',
      value: summary
        ? formatCount(summary.stock.productsWithStock)
        : '—',
      detail: summary
        ? `${formatCount(summary.stock.availableUnits)} unidades disponibles`
        : '',
      icon: Package,
      color: 'green',
    },
    {
      title: 'Clientes Activos',
      value: summary ? formatCount(summary.activeCustomers) : '—',
      detail: 'Clientes con estado activo',
      icon: Users,
      color: 'purple',
    },
    {
      title: 'Ingresos Totales',
      value: summary ? formatCurrency(summary.totalIncome) : '—',
      detail: 'Ventas completadas, todos los métodos',
      icon: DollarSign,
      color: 'amber',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Bienvenido, {user?.full_name ?? 'usuario'}
        </h1>
        <p className="text-gray-600 mt-1">
          Resumen actualizado de ventas, inventario y clientes.
        </p>
      </div>

      {error && (
        <div
          className="flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 sm:flex-row sm:items-center sm:justify-between"
          role="alert"
        >
          <p>{error}</p>
          <button
            type="button"
            className="inline-flex items-center gap-2 self-start rounded-md border border-red-300 bg-white px-3 py-2 text-sm font-medium hover:bg-red-100 sm:self-auto"
            onClick={() => setReloadKey((key) => key + 1)}
          >
            <RefreshCw size={16} aria-hidden="true" />
            Reintentar
          </button>
        </div>
      )}

      <div
        className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4"
        aria-busy={isLoading}
      >
        {stats.map((stat) => {
          const Icon = stat.icon;
          const colorClasses: Record<string, string> = {
            blue: 'bg-blue-50 text-blue-600',
            green: 'bg-green-50 text-green-600',
            purple: 'bg-purple-50 text-purple-600',
            amber: 'bg-amber-50 text-amber-600',
          };

          return (
            <div key={stat.title} className="rounded-lg bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div
                  className={`${colorClasses[stat.color]} p-3 rounded-lg`}
                >
                  <Icon size={24} aria-hidden="true" />
                </div>
              </div>
              <p className="text-gray-600 text-sm">{stat.title}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {isLoading ? 'Cargando...' : stat.value}
              </p>
              <p className="mt-1 text-sm text-gray-500">{stat.detail}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="rounded-lg bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-gray-900">Ventas Recientes</h2>
          </div>
          {isLoading ? (
            <p className="text-sm text-gray-600">Cargando ventas...</p>
          ) : error ? (
            <p className="text-sm text-gray-600">
              No fue posible cargar las ventas recientes.
            </p>
          ) : summary?.recentSales.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[32rem] text-left text-sm">
                <thead className="border-b text-xs uppercase text-gray-500">
                  <tr>
                    <th className="py-2 pr-3 font-medium">Transacción</th>
                    <th className="py-2 pr-3 font-medium">Fecha</th>
                    <th className="py-2 pr-3 font-medium">Método</th>
                    <th className="py-2 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {summary.recentSales.map((sale) => (
                    <tr key={sale.id}>
                      <td className="py-3 pr-3 font-medium text-gray-900">
                        {sale.transactionNumber}
                      </td>
                      <td className="py-3 pr-3 text-gray-600">
                        {new Date(sale.createdAt).toLocaleString('es-MX')}
                      </td>
                      <td className="py-3 pr-3 capitalize text-gray-600">
                        {sale.paymentMethod}
                      </td>
                      <td className="py-3 text-right font-medium text-gray-900">
                        {formatCurrency(sale.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-600">
              Aún no hay ventas completadas.
            </p>
          )}
        </section>

        <section className="rounded-lg bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Productos con Bajo Stock
              </h2>
              {!isLoading && !error && summary && (
                <p className="mt-1 text-sm text-gray-500">
                  {formatCount(summary.lowStockCount)} productos en o por debajo
                  del mínimo
                </p>
              )}
            </div>
            <Link
              href="/dashboard/inventario"
              className="shrink-0 text-sm font-medium text-blue-700 hover:text-blue-900"
            >
              Ver inventario
            </Link>
          </div>
          {isLoading ? (
            <p className="text-sm text-gray-600">Cargando inventario...</p>
          ) : error ? (
            <p className="text-sm text-gray-600">
              No fue posible cargar el inventario.
            </p>
          ) : summary?.lowStockProducts.length ? (
            <ul className="divide-y divide-gray-100">
              {summary.lowStockProducts.map((product) => (
                <li
                  key={product.id}
                  className="flex items-center justify-between gap-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-gray-900">
                      {product.name}
                    </p>
                    <p className="truncate text-sm text-gray-500">
                      {product.productCode}
                    </p>
                  </div>
                  <p className="shrink-0 text-right text-sm text-red-700">
                    {formatCount(product.quantityOnHand)} /{' '}
                    {formatCount(product.reorderLevel)} unidades
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-600">
              No hay productos con bajo stock.
            </p>
          )}
          {!isLoading &&
            !error &&
            summary &&
            summary.lowStockCount > summary.lowStockProducts.length && (
              <p className="mt-3 text-sm text-gray-500">
                Mostrando los primeros {summary.lowStockProducts.length} productos.
              </p>
            )}
        </section>
      </div>
    </div>
  );
}

