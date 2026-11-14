'use client';

import { useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/hooks';
import { supabaseClient } from '@/lib/db/supabase-client';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { setUser, setLoading } = useAuthStore();

  useEffect(() => {
    let isMounted = true;

    const checkSession = async () => {
      try {
        // First, try to restore session from localStorage
        if (typeof window !== 'undefined') {
          const storedSession = localStorage.getItem('supabase-session');
          const storedAccessToken = localStorage.getItem('supabase-access-token');
          const storedUser = localStorage.getItem('supabase-user');

          if (storedSession && storedAccessToken) {
            const session = JSON.parse(storedSession);
            // Set the session in Supabase client
            await supabaseClient.auth.setSession(session);

            if (storedUser && isMounted) {
              const user = JSON.parse(storedUser);
              
              // Obtener perfil del usuario
              const { data: profile } = await supabaseClient
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
            }
            return;
          }
        }

        // If no localStorage session, check Supabase session
        const { data: { session } } = await supabaseClient.auth.getSession();
        
        if (session?.user && isMounted) {
          // Obtener perfil del usuario
          const { data: profile } = await supabaseClient
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
        if (isMounted) {
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    checkSession();

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;

        if (session?.user) {
          const { data: profile } = await supabaseClient
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
          setLoading(false);

          // Persist to localStorage
          if (typeof window !== 'undefined') {
            localStorage.setItem('supabase-session', JSON.stringify(session));
            localStorage.setItem('supabase-access-token', session.access_token);
            localStorage.setItem('supabase-refresh-token', session.refresh_token || '');
            localStorage.setItem('supabase-user', JSON.stringify(session.user));
          }
        } else {
          setUser(null);
          setLoading(false);
          
          // Clear localStorage
          if (typeof window !== 'undefined') {
            localStorage.removeItem('supabase-session');
            localStorage.removeItem('supabase-access-token');
            localStorage.removeItem('supabase-refresh-token');
            localStorage.removeItem('supabase-user');
          }

          // Redirigir a login si la sesión expira
          if (pathname !== '/login' && pathname !== '/signup') {
            router.push('/login');
          }
        }
      }
    );

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, [setUser, setLoading, pathname, router]);

  return children;
}
