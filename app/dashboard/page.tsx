'use client';

import { useAuthStore } from '@/hooks';
import { BarChart3, TrendingUp, Package, Users, DollarSign } from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuthStore();

  const stats = [
    {
      title: 'Ventas del Mes',
      value: 'Q 45,230.00',
      change: '+12.5%',
      icon: TrendingUp,
      color: 'blue',
    },
    {
      title: 'Productos en Stock',
      value: '1,240',
      change: '-2.3%',
      icon: Package,
      color: 'green',
    },
    {
      title: 'Clientes Activos',
      value: '385',
      change: '+8.1%',
      icon: Users,
      color: 'purple',
    },
    {
      title: 'Ingresos Totales',
      value: 'Q 128,450.00',
      change: '+23.4%',
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
          Aquí está el resumen de tu negocio
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
                <span className="text-green-600 text-sm font-semibold">
                  {stat.change}
                </span>
              </div>
              <p className="text-gray-600 text-sm">{stat.title}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {stat.value}
              </p>
            </div>
          );
        })}
      </div>

      {/* Coming Soon */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Sales */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Ventas Recientes</h2>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="flex items-center justify-between pb-4 border-b border-gray-100 last:border-0"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Factura #{1001 + i}
                  </p>
                  <p className="text-xs text-gray-500">Cliente #{i}</p>
                </div>
                <p className="text-sm font-semibold text-gray-900">
                  Q {(Math.random() * 5000).toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Low Stock Products */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            Productos con Bajo Stock
          </h2>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="flex items-center justify-between pb-4 border-b border-gray-100 last:border-0"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Producto {i}
                  </p>
                  <p className="text-xs text-gray-500">SKU: PRD-{1000 + i}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-red-600">{i} unidades</p>
                  <p className="text-xs text-gray-500">Stock mínimo: 10</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
