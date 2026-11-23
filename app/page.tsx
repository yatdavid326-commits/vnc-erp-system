'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Page() {
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const response = await fetch('/api/auth/restore', { cache: 'no-store' });
      router.replace(response.ok ? '/dashboard' : '/login');
    };

    void checkAuth().catch((error) => {
      console.error('Error checking the current session:', error);
      router.replace('/login');
    });
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Verificando acceso...</p>
      </div>
    </div>
  );
}
