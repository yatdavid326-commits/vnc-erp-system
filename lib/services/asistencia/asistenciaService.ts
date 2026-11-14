import { supabaseAdmin } from '@/lib/db/supabase';

export interface Asistencia {
  id: string;
  empleado_id: string;
  fecha: string;
  hora_entrada: string;
  hora_salida?: string;
  latitud_entrada: number;
  longitud_entrada: number;
  latitud_salida?: number;
  longitud_salida?: number;
  qr_code?: string;
  observaciones?: string;
  created_at: string;
  updated_at?: string;
}

export const asistenciaService = {
  async getAll(page = 1, limit = 50) {
    try {
      if (!supabaseAdmin) throw new Error('Admin client not available');
      
      const start = (page - 1) * limit;
      
      const { data, error, count } = await supabaseAdmin
        .from('asistencia')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(start, start + limit - 1);
      
      if (error) throw error;
      return { data: data || [], count: count || 0 };
    } catch (error) {
      return { data: [], count: 0, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  async getByEmpleado(empleadoId: string, limit = 50) {
    try {
      if (!supabaseAdmin) throw new Error('Admin client not available');
      
      const { data, error } = await supabaseAdmin
        .from('asistencia')
        .select('*')
        .eq('empleado_id', empleadoId)
        .order('fecha', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error) {
      return { data: [], error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  async search(query: string, limit = 50) {
    try {
      if (!supabaseAdmin) throw new Error('Admin client not available');
      
      const { data, error } = await supabaseAdmin
        .from('asistencia')
        .select('*')
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
        .from('asistencia')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  async create(asistencia: Partial<Asistencia>) {
    try {
      if (!supabaseAdmin) throw new Error('Admin client not available');
      
      const { data, error } = await supabaseAdmin
        .from('asistencia')
        .insert([asistencia])
        .select()
        .single();
      
      if (error) throw error;
      return { data };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  async update(id: string, asistencia: Partial<Asistencia>) {
    try {
      if (!supabaseAdmin) throw new Error('Admin client not available');
      
      const { data, error } = await supabaseAdmin
        .from('asistencia')
        .update(asistencia)
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
        .from('asistencia')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },
};
