export type ApiPermission =
  | 'can_view'
  | 'can_create'
  | 'can_edit'
  | 'can_delete';

const moduleRoutes = [
  ['/api/asistencia', 'attendance'],
  ['/api/caja', 'cash'],
  ['/api/clientes', 'clients'],
  ['/api/compras', 'purchases'],
  ['/api/dashboard', 'dashboard'],
  ['/api/empleados', 'employees'],
  ['/api/inventario', 'inventory'],
  ['/api/pos', 'pos'],
  ['/api/proveedores', 'suppliers'],
  ['/api/reportes', 'reports'],
] as const;

const permissionByMethod: Record<string, ApiPermission | undefined> = {
  GET: 'can_view',
  HEAD: 'can_view',
  POST: 'can_create',
  PUT: 'can_edit',
  PATCH: 'can_edit',
  DELETE: 'can_delete',
};

const adminApiPaths = new Set(['/api/admin/permissions', '/api/admin/audit']);

export const selfServiceApiPaths = new Set([
  '/api/auth/restore',
  '/api/modules/user',
  '/api/notifications',
  '/api/notifications/preferences',
  '/api/user/profile',
]);

export function isAdminApiPath(pathname: string): boolean {
  return adminApiPaths.has(pathname);
}

export function canAccessAdminApi(
  pathname: string,
  profile: { role: string | null; is_active: boolean | null } | null
): boolean {
  return (
    isAdminApiPath(pathname) &&
    profile?.role === 'admin' &&
    profile.is_active === true
  );
}

export function getRequiredApiPermission(
  pathname: string,
  method: string
): { moduleName: string; permission: ApiPermission } | null {
  const moduleRoute = moduleRoutes.find(
    ([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
  let permission = permissionByMethod[method];
  if (method === 'POST' && pathname === '/api/reportes/email') {
    permission = 'can_view';
  } else if (
    method === 'POST' &&
    (/^\/api\/clientes\/[^/]+\/(credit|transactions)$/.test(pathname) ||
      /^\/api\/inventario\/[^/]+\/movimientos$/.test(pathname) ||
      /^\/api\/compras\/[^/]+\/(recepcion|recepcion-parcial|anulacion|detalles)$/.test(pathname))
  ) {
    permission = 'can_edit';
  }

  if (!moduleRoute || !permission) {
    return null;
  }

  return { moduleName: moduleRoute[1], permission };
}

export function getRequiredApiPermissions(
  pathname: string,
  method: string
): { moduleName: string; permission: ApiPermission }[] {
  const requirement = getRequiredApiPermission(pathname, method);
  if (!requirement) return [];

  if (
    method === 'POST' &&
    /^\/api\/compras\/[^/]+\/(recepcion|recepcion-parcial)$/.test(pathname)
  ) {
    return [requirement, { moduleName: 'inventory', permission: 'can_edit' }];
  }
  return [requirement];
}
