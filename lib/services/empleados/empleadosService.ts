import { supabaseAdmin } from '@/lib/db/supabase';

export interface Empleado {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  teléfono: string;
  puesto: string;
  departamento: string;
  fecha_ingreso: string;
  salario: number;
  estado: boolean;
  created_at: string;
  updated_at?: string;
}

export const empleadosService = {
  async getAll(page = 1, limit = 50) {
    try {
      if (!supabaseAdmin) throw new Error('Admin client not available');
      
      const start = (page - 1) * limit;
      
      const { data, error, count } = await supabaseAdmin
        .from('empleados')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(start, start + limit - 1);
      
      if (error) throw error;
      return { data: data || [], count: count || 0 };
    } catch (error) {
      return { data: [], count: 0, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  async search(query: string, limit = 50) {
    try {
      if (!supabaseAdmin) throw new Error('Admin client not available');
      
      const { data, error } = await supabaseAdmin
        .from('empleados')
        .select('*')
        .or(`nombre.ilike.%${query}%,email.ilike.%${query}%,puesto.ilike.%${query}%`)
        .limit(limit);
      
      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error) {
      return { data: [], error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  async getById(id: string) {
    try {
      if (!supabaseAdmin) throw new Error('Admin client not available');
      
      const { data, error } = await supabaseAdmin
        .from('empleados')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  async create(empleado: Partial<Empleado>) {
    try {
      if (!supabaseAdmin) throw new Error('Admin client not available');
      
      const { data, error } = await supabaseAdmin
        .from('empleados')
        .insert([empleado])
        .select()
        .single();
      
      if (error) throw error;
      return { data };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  async update(id: string, empleado: Partial<Empleado>) {
    try {
      if (!supabaseAdmin) throw new Error('Admin client not available');
      
      const { data, error } = await supabaseAdmin
        .from('empleados')
        .update(empleado)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return { data };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  async delete(id: string) {
    try {
      if (!supabaseAdmin) throw new Error('Admin client not available');
      
      const { error } = await supabaseAdmin
        .from('empleados')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },
};
