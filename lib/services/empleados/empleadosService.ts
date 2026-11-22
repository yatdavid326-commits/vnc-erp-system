import { supabaseAdmin } from '@/lib/db/supabase';
import { sanitizePostgrestSearch } from '@/lib/utils/search';

export interface Empleado {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  cargo: string;
  departamento: string;
  fecha_ingreso: string;
  salario: number;
  estado: 'activo' | 'inactivo';
  created_at: string;
  updated_at?: string;
}

interface EmployeeRow {
  id: string;
  nombre: string;
  apellido: string | null;
  email: string;
  teléfono: string | null;
  puesto: string | null;
  departamento: string | null;
  fecha_ingreso: string | null;
  salario: number | null;
  estado: boolean;
  created_at: string;
  updated_at: string | null;
}

function requireSupabaseAdmin() {
  if (!supabaseAdmin) throw new Error('Admin client not available');
  return supabaseAdmin;
}

function mapEmployee(row: EmployeeRow): Empleado {
  return {
    id: row.id,
    nombre: row.nombre,
    apellido: row.apellido ?? '',
    email: row.email,
    telefono: row.teléfono ?? '',
    cargo: row.puesto ?? '',
    departamento: row.departamento ?? '',
    fecha_ingreso: row.fecha_ingreso ?? '',
    salario: Number(row.salario ?? 0),
    estado: row.estado ? 'activo' : 'inactivo',
    created_at: row.created_at,
    updated_at: row.updated_at ?? undefined,
  };
}

function mapEmployeeInput(employee: Partial<Empleado>) {
  const row: Record<string, string | number | boolean | null> = {};
  if (employee.nombre !== undefined) row.nombre = employee.nombre;
  if (employee.apellido !== undefined) row.apellido = employee.apellido || null;
  if (employee.email !== undefined) row.email = employee.email;
  if (employee.telefono !== undefined) row['teléfono'] = employee.telefono || null;
  if (employee.cargo !== undefined) row.puesto = employee.cargo || null;
  if (employee.departamento !== undefined) row.departamento = employee.departamento || null;
  if (employee.fecha_ingreso !== undefined) row.fecha_ingreso = employee.fecha_ingreso;
  if (employee.salario !== undefined) row.salario = employee.salario;
  if (employee.estado !== undefined) row.estado = employee.estado === 'activo';
  return row;
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }
  return 'Database operation failed';
}

export const empleadosService = {
  async getAll(
    page = 1,
    limit = 50,
    filters: { search?: string; status?: 'activo' | 'inactivo' } = {}
  ) {
    try {
      const start = (page - 1) * limit;
      let query = requireSupabaseAdmin()
        .from('empleados')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .order('id', { ascending: false });

      const safeSearch = sanitizePostgrestSearch(filters.search ?? '');
      if (safeSearch) {
        query = query.or(
          `nombre.ilike.%${safeSearch}%,apellido.ilike.%${safeSearch}%,email.ilike.%${safeSearch}%,puesto.ilike.%${safeSearch}%`
        );
      }
      if (filters.status) query = query.eq('estado', filters.status === 'activo');

      const { data, error, count } = await query.range(start, start + limit - 1);
      if (error) throw error;
      return { data: (data ?? []).map((row) => mapEmployee(row as EmployeeRow)), count: count ?? 0 };
    } catch (error) {
      return { data: [], count: 0, error: errorMessage(error) };
    }
  },

  async search(query: string, limit = 50) {
    try {
      const safeQuery = sanitizePostgrestSearch(query);
      const { data, error } = await requireSupabaseAdmin()
        .from('empleados')
        .select('*')
        .or(`nombre.ilike.%${safeQuery}%,email.ilike.%${safeQuery}%,puesto.ilike.%${safeQuery}%`)
        .limit(limit);
      if (error) throw error;
      return { data: (data ?? []).map((row) => mapEmployee(row as EmployeeRow)), error: null };
    } catch (error) {
      return { data: [], error: errorMessage(error) };
    }
  },

  async getById(id: string) {
    try {
      const { data, error } = await requireSupabaseAdmin()
        .from('empleados')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return { data: data ? mapEmployee(data as EmployeeRow) : null, error: null };
    } catch (error) {
      return { data: null, error: errorMessage(error) };
    }
  },

  async create(employee: Partial<Empleado>) {
    try {
      const { data, error } = await requireSupabaseAdmin()
        .from('empleados')
        .insert(mapEmployeeInput(employee))
        .select('*')
        .single();
      if (error) throw error;
      return { data: mapEmployee(data as EmployeeRow), error: null };
    } catch (error) {
      return { data: null, error: errorMessage(error) };
    }
  },

  async update(id: string, employee: Partial<Empleado>) {
    try {
      const { data, error } = await requireSupabaseAdmin()
        .from('empleados')
        .update(mapEmployeeInput(employee))
        .eq('id', id)
        .select('*')
        .maybeSingle();
      if (error) throw error;
      return { data: data ? mapEmployee(data as EmployeeRow) : null, error: null };
    } catch (error) {
      return { data: null, error: errorMessage(error) };
    }
  },

  async delete(id: string) {
    try {
      const { error } = await requireSupabaseAdmin().from('empleados').delete().eq('id', id);
      if (error) throw error;
      return { success: true, error: null };
    } catch (error) {
      return { success: false, error: errorMessage(error) };
    }
  },
};
