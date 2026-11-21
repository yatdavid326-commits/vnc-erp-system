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

export const selfServiceApiPaths = new Set([
  '/api/auth/restore',
  '/api/modules/user',
  '/api/user/profile',
]);

export function getRequiredApiPermission(
  pathname: string,
  method: string
): { moduleName: string; permission: ApiPermission } | null {
  const moduleRoute = moduleRoutes.find(
    ([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
  const permission =
    method === 'POST' && (
      /^\/api\/clientes\/[^/]+\/credit$/.test(pathname) ||
      /^\/api\/inventario\/[^/]+\/movimientos$/.test(pathname)
    )
      ? 'can_edit'
      : permissionByMethod[method];

  if (!moduleRoute || !permission) {
    return null;
  }

  return { moduleName: moduleRoute[1], permission };
}
