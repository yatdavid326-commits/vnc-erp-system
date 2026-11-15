import { authorizeModule, type ModulePermission } from '@/lib/services/modules/authorization';

export function authorizeCustomer(request: Request, permission: ModulePermission) {
  return authorizeModule(request, 'clients', permission);
}
