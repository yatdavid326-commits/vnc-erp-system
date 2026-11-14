import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const pathName = requestUrl.pathname;

  // Crear cliente de Supabase para acceso a cookies
  let supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getSetCookie();
        },
        setAll(cookiesToSet) {
          const response = NextResponse.next();
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
          return response;
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Rutas protegidas (no login/signup)
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

  const isProtectedRoute = protectedRoutes.some((route) =>
    pathName.startsWith(route)
  );

  // Si intenta acceder a ruta protegida sin sesión
  if (isProtectedRoute && !user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Si está en login/signup pero ya autenticado
  if ((pathName === '/login' || pathName === '/signup') && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.svg|.*\\.png|.*\\.jpg).*)',
  ],
};
