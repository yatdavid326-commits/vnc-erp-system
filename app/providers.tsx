'use client';

import { useEffect, ReactNode, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/hooks';
import { ToastProvider } from '@/components/notifications/ToastProvider';
import type { User } from '@/lib/types';

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
        if (typeof window !== 'undefined') {
          for (const key of [
            'supabase-session',
            'supabase-access-token',
            'supabase-refresh-token',
            'supabase-user',
          ]) {
            localStorage.removeItem(key);
          }

          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
          if (supabaseUrl) {
            const projectRef = new URL(supabaseUrl).hostname.split('.')[0];
            if (projectRef) {
              localStorage.removeItem(`sb-${projectRef}-auth-token`);
              localStorage.removeItem(
                `sb-${projectRef}-auth-token-code-verifier`
              );
            }
          }
        }

        const response = await fetch('/api/auth/restore', {
          cache: 'no-store',
        });
        if (!response.ok) {
          if (isMounted) {
            setUser(null);
            if (pathname?.startsWith('/dashboard')) {
              router.replace('/login');
            }
          }
          return;
        }

        const restored = (await response.json()) as {
          user: { id: string; email?: string; user_metadata?: Record<string, unknown> };
          profile: User;
        };
        if (!restored.user?.id || !restored.profile?.id) {
          throw new Error('Session restore returned an invalid profile.');
        }
        if (isMounted) {
          setUser({
            ...restored.profile,
            auth_id: restored.user.id,
            email: restored.profile.email || restored.user.email || '',
            username:
              restored.profile.username ||
              (typeof restored.user.user_metadata?.username === 'string'
                ? restored.user.user_metadata.username
                : 'user'),
            full_name:
              restored.profile.full_name ||
              (typeof restored.user.user_metadata?.full_name === 'string'
                ? restored.user.user_metadata.full_name
                : 'Usuario'),
            role: restored.profile.role || 'user',
          });
        }
      } catch (error) {
        console.error('Error restoring session:', error);
        if (isMounted) {
          setUser(null);
          if (pathname?.startsWith('/dashboard')) {
            router.replace('/login');
          }
        }
      } finally {
        if (isMounted) {
          setIsChecking(false);
          setLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
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

  return <ToastProvider>{children}</ToastProvider>;
}
