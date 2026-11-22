import { supabaseAdmin } from '@/lib/db/supabase';
import { sanitizePostgrestSearch } from '@/lib/utils/search';

export interface Proveedor {
  id: string;
  nombre: string;
  persona_contacto: string;
  email: string;
  teléfono: string;
  dirección: string;
  ciudad: string;
  estado: string;
  país: string;
  términos_pago: string;
  activo: boolean;
  created_at: string;
  updated_at?: string;
}

interface SupplierRow {
  id: string;
  name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  payment_terms: string | null;
  is_active: boolean | null;
  created_at: string;
  updated_at: string;
}

function requireSupabaseAdmin() {
  if (!supabaseAdmin) throw new Error('Admin client not available');
  return supabaseAdmin;
}

function mapSupplier(row: SupplierRow): Proveedor {
  return {
    id: row.id,
    nombre: row.name,
    persona_contacto: row.contact_person ?? '',
    email: row.email ?? '',
    teléfono: row.phone ?? '',
    dirección: row.address ?? '',
    ciudad: row.city ?? '',
    estado: row.state ?? '',
    país: row.country ?? '',
    términos_pago: row.payment_terms ?? '',
    activo: row.is_active === true,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapSupplierInput(supplier: Partial<Proveedor>) {
  const row: Record<string, string | boolean | null> = {};
  if (supplier.nombre !== undefined) row.name = supplier.nombre;
  if (supplier.persona_contacto !== undefined) row.contact_person = supplier.persona_contacto || null;
  if (supplier.email !== undefined) row.email = supplier.email || null;
  if (supplier.teléfono !== undefined) row.phone = supplier.teléfono || null;
  if (supplier.dirección !== undefined) row.address = supplier.dirección || null;
  if (supplier.ciudad !== undefined) row.city = supplier.ciudad || null;
  if (supplier.estado !== undefined) row.state = supplier.estado || null;
  if (supplier.país !== undefined) row.country = supplier.país || null;
  if (supplier.términos_pago !== undefined) row.payment_terms = supplier.términos_pago || null;
  if (supplier.activo !== undefined) row.is_active = supplier.activo;
  return row;
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }
  return 'Database operation failed';
}

export const proveedoresService = {
  async getAll(
    page = 1,
    limit = 50,
    filters: { search?: string; status?: 'activo' | 'inactivo'; country?: string } = {}
  ) {
    try {
      const start = (page - 1) * limit;
      let query = requireSupabaseAdmin()
        .from('suppliers')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      const safeSearch = sanitizePostgrestSearch(filters.search ?? '');
      if (safeSearch) {
        query = query.or(
          `name.ilike.%${safeSearch}%,email.ilike.%${safeSearch}%,contact_person.ilike.%${safeSearch}%`
        );
      }
      if (filters.status) query = query.eq('is_active', filters.status === 'activo');
      if (filters.country) query = query.eq('country', filters.country);

      const { data, error, count } = await query.range(start, start + limit - 1);
      if (error) throw error;
      return { data: (data ?? []).map((row) => mapSupplier(row as SupplierRow)), count: count ?? 0, error: null };
    } catch (error) {
      return { data: [], count: 0, error: errorMessage(error) };
    }
  },

  async search(query: string, limit = 50) {
    try {
      const safeQuery = sanitizePostgrestSearch(query);
      const { data, error } = await requireSupabaseAdmin()
        .from('suppliers')
        .select('*')
        .or(`name.ilike.%${safeQuery}%,email.ilike.%${safeQuery}%,contact_person.ilike.%${safeQuery}%`)
        .limit(limit);
      if (error) throw error;
      return { data: (data ?? []).map((row) => mapSupplier(row as SupplierRow)), error: null };
    } catch (error) {
      return { data: [], error: errorMessage(error) };
    }
  },

  async getByCountry(country: string, page = 1, limit = 50) {
    try {
      const start = (page - 1) * limit;
      const { data, error, count } = await requireSupabaseAdmin()
        .from('suppliers')
        .select('*', { count: 'exact' })
        .eq('country', country)
        .order('created_at', { ascending: false })
        .range(start, start + limit - 1);
      if (error) throw error;
      return { data: (data ?? []).map((row) => mapSupplier(row as SupplierRow)), count: count ?? 0, error: null };
    } catch (error) {
      return { data: [], count: 0, error: errorMessage(error) };
    }
  },

  async getById(id: string) {
    try {
      const { data, error } = await requireSupabaseAdmin()
        .from('suppliers')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return { data: data ? mapSupplier(data as SupplierRow) : null, error: null };
    } catch (error) {
      return { data: null, error: errorMessage(error) };
    }
  },

  async create(supplier: Partial<Proveedor>) {
    try {
      const { data, error } = await requireSupabaseAdmin()
        .from('suppliers')
        .insert(mapSupplierInput(supplier))
        .select('*')
        .single();
      if (error) throw error;
      return { data: mapSupplier(data as SupplierRow), error: null };
    } catch (error) {
      return { data: null, error: errorMessage(error) };
    }
  },

  async update(id: string, supplier: Partial<Proveedor>) {
    try {
      const { data, error } = await requireSupabaseAdmin()
        .from('suppliers')
        .update({ ...mapSupplierInput(supplier), updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('*')
        .maybeSingle();
      if (error) throw error;
      return { data: data ? mapSupplier(data as SupplierRow) : null, error: null };
    } catch (error) {
      return { data: null, error: errorMessage(error) };
    }
  },

  async delete(id: string) {
    try {
      const { error } = await requireSupabaseAdmin().from('suppliers').delete().eq('id', id);
      if (error) throw error;
      return { success: true, error: null };
    } catch (error) {
      return { success: false, error: errorMessage(error) };
    }
  },
};
