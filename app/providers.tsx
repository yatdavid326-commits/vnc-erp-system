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
  const { setUser, setLoading } = useAuthStore();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        // Restore session from localStorage
        if (typeof window !== 'undefined') {
          const storedSession = localStorage.getItem('supabase-session');
          const storedAccessToken = localStorage.getItem('supabase-access-token');
          const storedUser = localStorage.getItem('supabase-user');

          if (storedSession && storedAccessToken) {
            try {
              const session = JSON.parse(storedSession);
              await supabaseClient.auth.setSession(session);

              if (storedUser && isMounted) {
                const user = JSON.parse(storedUser);
                
                // Set user immediately from stored data
                setUser({
                  id: user.id,
                  email: user.email || '',
                  username: user.username || 'user',
                  full_name: user.full_name || 'Usuario',
                  role: user.role || 'user',
                });
              }
            } catch (error) {
              console.error('Error restoring session:', error);
              // Redirect to login on error
              if (isMounted && pathname?.startsWith('/dashboard')) {
                router.push('/login');
              }
            }
          } else {
            // No stored session, redirect if on protected route
            if (isMounted && pathname?.startsWith('/dashboard')) {
              router.push('/login');
            }
          }
        }
      } catch (error) {
        console.error('Initialization error:', error);
      } finally {
        if (isMounted) {
          setIsChecking(false);
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen for auth state changes from Supabase
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted) return;

        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            username: session.user.user_metadata?.username || 'user',
            full_name: session.user.user_metadata?.full_name || 'Usuario',
            role: session.user.user_metadata?.role || 'user',
          });

          // Persist session
          if (typeof window !== 'undefined') {
            localStorage.setItem('supabase-session', JSON.stringify(session));
            localStorage.setItem('supabase-access-token', session.access_token);
            localStorage.setItem('supabase-refresh-token', session.refresh_token || '');
            localStorage.setItem('supabase-user', JSON.stringify(session.user));
          }
        } else {
          setUser(null);
          
          // Clear storage
          if (typeof window !== 'undefined') {
            localStorage.removeItem('supabase-session');
            localStorage.removeItem('supabase-access-token');
            localStorage.removeItem('supabase-refresh-token');
            localStorage.removeItem('supabase-user');
          }

          // Redirect on logout/session expiry
          if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
            if (pathname?.startsWith('/dashboard')) {
              router.push('/login');
            }
          }
        }
      }
    );

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, [pathname, router, setUser, setLoading]);

  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Inicializando...</p>
        </div>
      </div>
    );
  }

  return children;
}
