'use client';

import { useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/hooks';
import { supabase } from '@/lib/db/supabase';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { setUser, setLoading, user } = useAuthStore();

  useEffect(() => {
    // Verificar sesión al montar
    const checkSession = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (user) {
          // Obtener perfil del usuario
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          setUser({
            id: user.id,
            email: user.email || '',
            username: profile?.username || '',
            full_name: profile?.full_name || 'Usuario',
            role: profile?.role || 'user',
          });
        } else {
          setUser(null);
          // Redirigir a login si intenta acceder a ruta protegida
          const protectedRoutes = [
            '/dashboard',
            '/clientes',
            '/inventario',
            '/proveedores',
            '/compras',
            '/pos',
            '/caja',
            '/reportes',
            '/asistencia',
            '/empleados',
          ];
          
          if (protectedRoutes.some(route => pathname.startsWith(route))) {
            router.push('/login');
          }
        }
      } catch (error) {
        console.error('Error checking session:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          setUser({
            id: session.user.id,
            email: session.user.email || '',
            username: profile?.username || '',
            full_name: profile?.full_name || 'Usuario',
            role: profile?.role || 'user',
          });
        } else {
          setUser(null);
        }
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, [setUser, setLoading, pathname, router]);

  return children;
}
