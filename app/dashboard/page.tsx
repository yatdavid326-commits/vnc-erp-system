'use client';

import { useAuthStore } from '@/hooks';
import { TrendingUp, Package, Users, DollarSign } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function DashboardPage() {
  const { user } = useAuthStore();

  const stats = [
    {
      title: 'Ventas del Mes',
      icon: TrendingUp,
      color: 'blue',
    },
    {
      title: 'Productos en Stock',
      icon: Package,
      color: 'green',
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
          Las métricas reales todavía no están conectadas.
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
                No disponible
              </p>
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

