import { NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const pathName = requestUrl.pathname;

  // Verificar si hay sesión
  const sessionCookie = request.cookies.get('sb-session');

  // Rutas protegidas
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
  if (isProtectedRoute && !sessionCookie) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Si está en login/signup pero ya tiene sesión
  if ((pathName === '/login' || pathName === '/signup') && sessionCookie) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.svg|.*\\.png|.*\\.jpg).*)',
  ],
};

