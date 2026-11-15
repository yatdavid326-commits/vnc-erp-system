'use client';

import { useModuleStore } from '@/hooks';
import Link from 'next/link';
import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  Package,
  Truck,
  CreditCard,
  BarChart3,
  Clock,
  Settings,
  ChevronDown,
} from 'lucide-react';
import { useState } from 'react';

interface SidebarProps {
  collapsed?: boolean;
}

const moduleIcons: Record<string, React.ReactNode> = {
  dashboard: <LayoutDashboard size={20} />,
  clients: <Users size={20} />,
  inventory: <Package size={20} />,
  suppliers: <Truck size={20} />,
  purchases: <ShoppingCart size={20} />,
  pos: <CreditCard size={20} />,
  cash: <BarChart3 size={20} />,
  reports: <BarChart3 size={20} />,
  attendance: <Clock size={20} />,
  employees: <Users size={20} />,
};

export default function Sidebar({ collapsed = false }: SidebarProps) {
  const { userModules } = useModuleStore();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['main', 'operations', 'business', 'admin'])
  );

  const unavailableItems = (names: string[]) =>
    userModules.flatMap(({ module, can_view }) =>
      module && module.is_active && can_view && names.includes(module.name)
        ? [{ name: module.name, display_name: module.display_name, route: module.name === 'clients' ? '/dashboard/clientes' : module.name === 'suppliers' ? '/dashboard/proveedores' : module.name === 'inventory' ? '/dashboard/inventario' : null }]
        : []
    );

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const sections = {
    main: {
      label: 'Principal',
      items: [
        {
          name: 'dashboard',
          display_name: 'Panel de Control',
          route: '/dashboard',
        },
      ],
    },
    operations: {
      label: 'Operaciones',
      items: unavailableItems(['pos', 'inventory', 'cash']),
    },
    business: {
      label: 'Negocio',
      items: unavailableItems(['clients', 'suppliers', 'purchases']),
    },
    admin: {
      label: 'Administración',
      items: unavailableItems(['employees', 'attendance', 'reports']),
    },
  };

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-4 border-b border-gray-700">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold">
            V
          </div>
          {!collapsed && <span className="font-bold">VNC Systems</span>}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 space-y-2 px-2">
        {Object.entries(sections).map(([key, section]) => {
          if (section.items.length === 0) return null;

          return (
            <div key={key}>
              {!collapsed && (
                <button
                  onClick={() => toggleSection(key)}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider hover:text-gray-300 transition-colors"
                >
                  {section.label}
                  <ChevronDown
                    size={16}
                    className={`transition-transform ${
                      expandedSections.has(key) ? 'rotate-0' : '-rotate-90'
                    }`}
                  />
                </button>
              )}

              {(collapsed || expandedSections.has(key)) && (
                <div className="space-y-1">
                  {section.items.map((item) => item.route ? (
                    <Link
                      key={item.name}
                      href={item.route}
                      className="flex items-center gap-3 px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                      title={collapsed ? item.display_name : ''}
                    >
                      {moduleIcons[item.name] || <Settings size={20} />}
                      {!collapsed && <span className="text-sm">{item.display_name}</span>}
                    </Link>
                  ) : (
                    <div
                      key={item.name}
                      aria-disabled="true"
                      title={`${item.display_name}: aún no disponible`}
                      className="flex items-center gap-3 px-3 py-2 text-gray-500"
                    >
                      {moduleIcons[item.name] || <Settings size={20} />}
                      {!collapsed && <span className="text-sm">{item.display_name} (no disponible)</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-700 p-4">
        <Link
          href="/settings"
          className="flex items-center gap-3 px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
        >
          <Settings size={20} />
          {!collapsed && <span className="text-sm">Configuración</span>}
        </Link>
      </div>
    </div>
  );
}
