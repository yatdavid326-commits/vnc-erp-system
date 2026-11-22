'use client';

import { useEffect, useState } from 'react';
import { Save, ShieldCheck } from 'lucide-react';
import { supabaseClient } from '@/lib/db/supabase';
import { useToast } from '@/components/notifications/ToastProvider';

interface PermissionUser {
  id: string;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
}

interface PermissionModule {
  id: string;
  name: string;
  display_name: string;
  is_active: boolean;
  order_index: number;
}

interface ModulePermissions {
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

interface PermissionAssignment extends ModulePermissions {
  user_id: string;
  module_id: string;
}

interface AdminPermissionsResponse {
  users: PermissionUser[];
  modules: PermissionModule[];
  permissions: PermissionAssignment[];
}

const noPermissions: ModulePermissions = {
  can_view: false,
  can_create: false,
  can_edit: false,
  can_delete: false,
};

const permissionFields: (keyof ModulePermissions)[] = [
  'can_view',
  'can_create',
  'can_edit',
  'can_delete',
];

const permissionLabels: Record<keyof ModulePermissions, string> = {
  can_view: 'Ver',
  can_create: 'Crear',
  can_edit: 'Editar',
  can_delete: 'Eliminar',
};

function getAssignment(
  assignments: PermissionAssignment[],
  userId: string,
  moduleId: string
): ModulePermissions {
  const assignment = assignments.find(
    (item) => item.user_id === userId && item.module_id === moduleId
  );
  if (!assignment) return { ...noPermissions };
  return {
    can_view: assignment.can_view,
    can_create: assignment.can_create,
    can_edit: assignment.can_edit,
    can_delete: assignment.can_delete,
  };
}

function samePermissions(
  left: ModulePermissions,
  right: ModulePermissions
): boolean {
  return permissionFields.every((field) => left[field] === right[field]);
}

export default function PermissionsPage() {
  const { showToast } = useToast();
  const [users, setUsers] = useState<PermissionUser[]>([]);
  const [modules, setModules] = useState<PermissionModule[]>([]);
  const [assignments, setAssignments] = useState<PermissionAssignment[]>([]);
  const [drafts, setDrafts] = useState<Record<string, ModulePermissions>>({});
  const [selectedUserId, setSelectedUserId] = useState('');
  const [savingModuleId, setSavingModuleId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const selectedUser = users.find((user) => user.id === selectedUserId);

  useEffect(() => {
    let active = true;

    const loadPermissions = async () => {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabaseClient.auth.getSession();
        if (sessionError) throw sessionError;
        if (!session?.access_token) {
          throw new Error('Tu sesión expiró. Inicia sesión nuevamente.');
        }

        const response = await fetch('/api/admin/permissions', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const result = await response.json();
        if (!response.ok) {
          if (response.status === 403) {
            throw new Error(
              'Solo un administrador activo puede gestionar estos permisos.'
            );
          }
          throw new Error(result.error || 'No se pudieron cargar los permisos.');
        }

        const data = result as AdminPermissionsResponse;
        if (!active) return;
        setUsers(data.users);
        setModules(data.modules);
        setAssignments(data.permissions);
        setSelectedUserId(data.users[0]?.id ?? '');
      } catch (loadError) {
        if (!active) return;
        console.error('Error loading role permissions:', loadError);
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'No se pudieron cargar los permisos.'
        );
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void loadPermissions();
    return () => {
      active = false;
    };
  }, []);

  const updateDraft = (
    moduleId: string,
    field: keyof ModulePermissions,
    checked: boolean
  ) => {
    const existing =
      drafts[moduleId] ??
      getAssignment(assignments, selectedUserId, moduleId);
    const next = { ...existing, [field]: checked };

    if (field === 'can_view' && !checked) {
      next.can_create = false;
      next.can_edit = false;
      next.can_delete = false;
    } else if (field !== 'can_view' && checked) {
      next.can_view = true;
    }

    setDrafts((current) => ({ ...current, [moduleId]: next }));
    setError(null);
  };

  const saveModulePermissions = async (moduleId: string) => {
    if (!selectedUser || selectedUser.role === 'admin') return;

    const modulePermissions =
      drafts[moduleId] ??
      getAssignment(assignments, selectedUser.id, moduleId);
    setSavingModuleId(moduleId);
    setError(null);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabaseClient.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session?.access_token) {
        throw new Error('Tu sesión expiró. Inicia sesión nuevamente.');
      }

      const response = await fetch('/api/admin/permissions', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          user_id: selectedUser.id,
          module_id: moduleId,
          ...modulePermissions,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'No se pudieron guardar los permisos.');
      }

      setAssignments((current) => {
        const remaining = current.filter(
          (item) =>
            item.user_id !== selectedUser.id || item.module_id !== moduleId
        );
        return result.permission
          ? [...remaining, result.permission as PermissionAssignment]
          : remaining;
      });
      setDrafts((current) => {
        const next = { ...current };
        delete next[moduleId];
        return next;
      });
      showToast(
        `Permisos de ${modules.find((module) => module.id === moduleId)?.display_name} guardados.`,
        'success'
      );
    } catch (saveError) {
      console.error('Error saving role permissions:', saveError);
      showToast(
        saveError instanceof Error
          ? saveError.message
          : 'No se pudieron guardar los permisos.',
        'error'
      );
    } finally {
      setSavingModuleId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-gray-600">Cargando usuarios y permisos...</p>
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <header className="flex items-start gap-3">
        <ShieldCheck className="mt-1 text-blue-700" size={28} aria-hidden="true" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Roles y Permisos</h1>
          <p className="mt-1 text-sm text-gray-600">
            Administra el acceso de lectura, creación, edición y eliminación por módulo.
          </p>
        </div>
      </header>

      {error && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}
      {users.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-600">
          No hay usuarios activos para administrar.
        </div>
      ) : (
        <>
          <div className="max-w-xl rounded-lg border border-gray-200 bg-white p-4">
            <label
              htmlFor="permission-user"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Usuario
            </label>
            <select
              id="permission-user"
              value={selectedUserId}
              disabled={savingModuleId !== null}
              onChange={(event) => {
                setSelectedUserId(event.target.value);
                setDrafts({});
                setError(null);
              }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.full_name} — {user.email} ({user.role})
                </option>
              ))}
            </select>
          </div>

          {selectedUser?.role === 'admin' ? (
            <p className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
              Este usuario tiene acceso total por su rol de administrador; sus permisos por módulo no se modifican aquí.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                      Módulo
                    </th>
                    {permissionFields.map((field) => (
                      <th
                        key={field}
                        scope="col"
                        className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-600"
                      >
                        {permissionLabels[field]}
                      </th>
                    ))}
                    <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-600">
                      Acción
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {modules.map((module) => {
                    const saved = getAssignment(
                      assignments,
                      selectedUserId,
                      module.id
                    );
                    const draft = drafts[module.id] ?? saved;
                    const isDirty = !samePermissions(saved, draft);

                    return (
                      <tr key={module.id}>
                        <th scope="row" className="whitespace-nowrap px-4 py-3 text-left text-sm font-medium text-gray-900">
                          {module.display_name}
                        </th>
                        {permissionFields.map((field) => (
                          <td key={field} className="px-3 py-3 text-center">
                            <input
                              type="checkbox"
                              aria-label={`${permissionLabels[field]}: ${module.display_name}`}
                              checked={draft[field]}
                              onChange={(event) =>
                                updateDraft(module.id, field, event.target.checked)
                              }
                              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                          </td>
                        ))}
                        <td className="whitespace-nowrap px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => void saveModulePermissions(module.id)}
                            disabled={!isDirty || savingModuleId !== null}
                            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                          >
                            <Save size={15} aria-hidden="true" />
                            {savingModuleId === module.id ? 'Guardando...' : 'Guardar'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}
