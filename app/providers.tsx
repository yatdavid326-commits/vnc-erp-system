'use client';

import { useEffect, ReactNode, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/hooks';
import { supabaseClient } from '@/lib/db/supabase';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { setUser, setLoading, user } = useAuthStore();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const checkSession = async () => {
      try {
        // Only check session once on app initialization
        if (isInitialized) return;

        setLoading(true);

        // First, try to restore session from localStorage
        if (typeof window !== 'undefined') {
          const storedSession = localStorage.getItem('supabase-session');
          const storedAccessToken = localStorage.getItem('supabase-access-token');
          const storedUser = localStorage.getItem('supabase-user');

          if (storedSession && storedAccessToken) {
            try {
              const session = JSON.parse(storedSession);
              // Set the session in Supabase client
              await supabaseClient.auth.setSession(session);

              if (storedUser && isMounted) {
                const user = JSON.parse(storedUser);
                
                // Obtener perfil del usuario
                try {
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
                } catch (error) {
                  // Profile query failed, set basic user
                  setUser({
                    id: user.id,
                    email: user.email || '',
                    username: 'user',
                    full_name: 'Usuario',
                    role: 'user',
                  });
                }
              }
              
              if (isMounted) {
                setIsInitialized(true);
              }
              return;
            } catch (error) {
              console.error('Error restoring session:', error);
            }
          }
        }

        // If no valid localStorage session and on a protected route, redirect
        const protectedRoutes = [
          '/dashboard',
          '/dashboard/clientes',
          '/dashboard/inventario',
          '/dashboard/proveedores',
          '/dashboard/compras',
          '/dashboard/pos',
          '/dashboard/caja',
          '/dashboard/reportes',
          '/dashboard/asistencia',
          '/dashboard/empleados',
        ];

        if (protectedRoutes.some(route => pathname.startsWith(route)) && !user) {
          router.push('/login');
        }

        if (isMounted) {
          setIsInitialized(true);
        }
      } catch (error) {
        console.error('Error checking session:', error);
        if (isMounted) {
          setIsInitialized(true);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    checkSession();

    // Listen for auth changes
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;

        if (session?.user) {
          try {
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
          } catch (error) {
            setUser({
              id: session.user.id,
              email: session.user.email || '',
              username: 'user',
              full_name: 'Usuario',
              role: 'user',
            });
          }
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

          // Redirigir a login solo si la sesión expira (evento)
          if (event === 'SIGNED_OUT' && pathname !== '/login' && pathname !== '/signup') {
            router.push('/login');
          }
        }
      }
    );

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, [router, pathname, setUser, setLoading, user, isInitialized]);

  return children;
}
