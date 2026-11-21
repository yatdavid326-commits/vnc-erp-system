import { supabaseAdmin } from '@/lib/db/supabase';

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }
  return 'Database operation failed';
}

export interface Compra {
  id: string;
  numero_po: string;
  proveedor_id: string;
  fecha_orden: string;
  fecha_entrega_esperada: string | null;
  estado: string;
  monto_total: number;
  created_at: string;
  updated_at?: string;
}

export const comprasService = {
  async getAll(page = 1, limit = 50) {
    try {
      if (!supabaseAdmin) throw new Error('Admin client not available');
      
      const start = (page - 1) * limit;
      
      const { data, error, count } = await supabaseAdmin
        .from('compras')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(start, start + limit - 1);
      
      if (error) throw error;
      return { data: data || [], count: count || 0 };
    } catch (error) {
      return { data: [], count: 0, error: getErrorMessage(error) };
    }
  },

  async search(query: string, limit = 50) {
    try {
      if (!supabaseAdmin) throw new Error('Admin client not available');
      
      const { data, error } = await supabaseAdmin
        .from('compras')
        .select('*')
        .or(`numero_po.ilike.%${query}%,estado.ilike.%${query}%`)
        .limit(limit);
      
      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error) {
      return { data: [], error: getErrorMessage(error) };
    }
  },

  async getById(id: string) {
    try {
      if (!supabaseAdmin) throw new Error('Admin client not available');
      
      const { data, error } = await supabaseAdmin
        .from('compras')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error: getErrorMessage(error) };
    }
  },

  async create(compra: Partial<Compra>) {
    try {
      if (!supabaseAdmin) throw new Error('Admin client not available');
      
      const { data, error } = await supabaseAdmin
        .from('compras')
        .insert([compra])
        .select()
        .single();
      
      if (error) throw error;
      return { data };
    } catch (error) {
      return { error: getErrorMessage(error) };
    }
  },

  async update(id: string, compra: Partial<Compra>) {
    try {
      if (!supabaseAdmin) throw new Error('Admin client not available');
      
      const { data, error } = await supabaseAdmin
        .from('compras')
        .update(compra)
        .eq('id', id)
        .select()
        .maybeSingle();
      
      if (error) throw error;
      return { data };
    } catch (error) {
      return { error: getErrorMessage(error) };
    }
  },

  async delete(id: string) {
    try {
      if (!supabaseAdmin) throw new Error('Admin client not available');
      
      const { data, error } = await supabaseAdmin
        .from('compras')
        .delete()
        .eq('id', id)
        .select('id')
        .maybeSingle();
      
      if (error) throw error;
      return { success: Boolean(data) };
    } catch (error) {
      return { error: getErrorMessage(error) };
    }
  },
};
