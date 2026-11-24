'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, Settings, User as UserIcon, Menu, X } from 'lucide-react';
import { authService } from '@/lib/services/auth/authService';
import { modulesService } from '@/lib/services/modules/modulesService';
import { useAuthStore, useModuleStore } from '@/hooks';
import dynamicImport from 'next/dynamic';
const CsvExportButton = dynamicImport(
  () => import('@/components/reports/CsvExportButton'),
  { ssr: false, loading: () => <span className="text-sm text-gray-500">CSV</span> }
);
const NotificationCenter = dynamicImport(
  () => import('@/components/notifications/NotificationCenter'),
  { ssr: false, loading: () => <span className="text-sm text-gray-500">Notificaciones</span> }
);
import Sidebar from './Sidebar';
import Link from 'next/link';
import { clearClientCache } from '@/lib/utils/clientCache';
import Tooltip from '@/components/common/Tooltip';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, setUser, isLoading } = useAuthStore();
  const { setModules, setUserModules } = useModuleStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const loadedUserId = useRef<string | null>(null);

  useEffect(() => {
    // Solo cargar datos del módulo, NO hacer check de sesión
    // (AuthProvider ya lo hace)
    if (!user || !user.id) {
      loadedUserId.current = null;
      return;
    }

    let active = true;

    const loadModules = async () => {
      let loaded = false;
      try {
        const [modules, userModules, profile] = await Promise.all([
          modulesService.getAllModules(),
          modulesService.getUserModulesWithDetails(),
          authService.getUserProfile(),
        ]);
        if (!active) return;
        setModules(modules);
        setUserModules(userModules);
        if (profile?.role && profile.role !== user.role) {
          setUser({ ...user, role: profile.role });
        }
        loaded = true;
      } catch (error) {
        if (active) console.error('Error loading modules:', error);
      } finally {
        if (active) {
          if (loaded) loadedUserId.current = user.id;
        }
      }
    };

    void loadModules();
    return () => {
      active = false;
    };
  }, [user, setUser, setModules, setUserModules]);

  const handleLogout = async () => {
    await authService.signOut();
    clearClientCache();
    setUser(null);
    router.push('/login');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {isMobileMenuOpen && (
        <button
          type="button"
          aria-label="Cerrar menú"
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 text-white transition-transform md:hidden ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar />
      </div>
      {/* Sidebar */}
      <div
        className={`${
          isSidebarOpen ? 'w-64' : 'w-20'
        } bg-gray-900 text-white transition-all duration-300 hidden md:flex flex-col`}
      >
        <Sidebar collapsed={!isSidebarOpen} />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-3 py-3 sm:px-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Tooltip label="Abrir o cerrar el menú" align="left">
              <button
                aria-label="Abrir o cerrar el menú"
                onClick={() => {
                  if (window.matchMedia('(min-width: 768px)').matches) {
                    setIsSidebarOpen((open) => !open);
                  } else {
                    setIsMobileMenuOpen((open) => !open);
                  }
                }}
                className="text-gray-600 hover:text-gray-900"
              >
                {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </Tooltip>
            <h1 className="max-w-40 truncate text-base font-bold text-gray-900 sm:max-w-none sm:text-xl">
              {process.env.NEXT_PUBLIC_BUSINESS_NAME}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <CsvExportButton />
            <NotificationCenter key={user.auth_id} />
            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  {user?.full_name?.[0]?.toUpperCase()}
                </div>
                <div className="text-left hidden sm:block">
                  <p className="text-sm font-medium text-gray-900">
                    {user?.full_name}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
                </div>
              </button>

              {/* User Dropdown Menu */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg z-50 border border-gray-200">
                  <Link
                    href="/profile"
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    <UserIcon size={16} />
                    Mi Perfil
                  </Link>
                  <Link
                    href="/settings"
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    <Settings size={16} />
                    Configuración
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors border-t border-gray-200"
                  >
                    <LogOut size={16} />
                    Cerrar Sesión
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-3 sm:p-4">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
