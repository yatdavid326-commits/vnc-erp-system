'use client';

import { useEffect, useState } from 'react';
import { useAuthStore, useModuleStore } from '@/hooks';
import { supabase } from '@/lib/db/supabase';
import { TrendingUp, Package, Users, DollarSign } from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const canViewInventory = useModuleStore((state) => state.userModules.some(
    (item) => item.module?.name === 'inventory' && item.module.is_active && item.can_view
  ));
  const [inventory, setInventory] = useState<{ count: number | null; error: string }>({ count: null, error: '' });
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!canViewInventory) return;
    let active = true;
    async function loadInventory() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error || !session?.access_token) throw new Error('No se pudo obtener la sesión. Inicia sesión nuevamente.');
        const response = await fetch('/api/inventario/resumen', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'No se pudo consultar el resumen de inventario.');
        if (!Number.isSafeInteger(result.products_in_stock) || result.products_in_stock < 0) {
          throw new Error('El resumen de inventario recibido no es válido.');
        }
        if (active) setInventory({ count: result.products_in_stock, error: '' });
      } catch (error) {
        if (active) setInventory({ count: null, error: error instanceof Error ? error.message : 'No se pudo consultar el resumen de inventario.' });
      }
    }
    void loadInventory();
    return () => { active = false; };
  }, [canViewInventory, revision]);

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
      inventory: true,
    },
    {
      title: 'Clientes Activos',
      icon: Users,
      color: 'purple',
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
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {!stat.inventory ? 'No disponible' :
                  !canViewInventory ? 'Sin permiso' :
                  inventory.error ? 'No disponible' :
                  inventory.count === null ? 'Cargando...' : inventory.count}
              </p>
              {stat.inventory && canViewInventory && (
                inventory.error ? <div role="alert" className="mt-2 text-sm text-red-700">
                  <p>{inventory.error}</p>
                  <button type="button" className="underline" onClick={() => {
                    setInventory({ count: null, error: '' }); setRevision((value) => value + 1);
                  }}>Reintentar</button>
                </div> : <p className="mt-2 text-sm text-gray-600">
                  Existencia física registrada mayor que cero; no incluye productos sin conteo.
                </p>
              )}
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
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            Productos con Bajo Stock
          </h2>
          <p className="text-sm text-gray-600">Datos reales aún no disponibles.</p>
        </div>
      </div>
    </div>
  );
}
