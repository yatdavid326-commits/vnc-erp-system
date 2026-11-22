import { supabaseAdmin } from '@/lib/db/supabase';

export interface Asistencia {
  id: string;
  empleado_id: string;
  fecha: string;
  hora_entrada: string;
  hora_salida?: string | null;
  latitud_entrada?: number | null;
  longitud_entrada?: number | null;
  latitud_salida?: number | null;
  longitud_salida?: number | null;
  qr_code?: string | null;
  observaciones?: string | null;
  created_at: string;
  updated_at?: string;
}

export const asistenciaService = {
  async getAll(
    page = 1,
    limit = 50,
    filters: {
      empleadoId?: string;
      desde?: string;
      hasta?: string;
      estado?: 'completa' | 'pendiente';
    } = {}
  ) {
    try {
      if (!supabaseAdmin) throw new Error('Admin client not available');

      const start = (page - 1) * limit;
      let query = supabaseAdmin
        .from('asistencia')
        .select('*', { count: 'exact' })
        .order('fecha', { ascending: false })
        .order('created_at', { ascending: false });

      if (filters.empleadoId) query = query.eq('empleado_id', filters.empleadoId);
      if (filters.desde) query = query.gte('fecha', filters.desde);
      if (filters.hasta) query = query.lte('fecha', filters.hasta);
      if (filters.estado === 'completa') query = query.not('hora_salida', 'is', null);
      if (filters.estado === 'pendiente') query = query.is('hora_salida', null);

      const { data, error, count } = await query.range(start, start + limit - 1);

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
