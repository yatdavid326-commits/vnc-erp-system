import { supabaseAdmin } from '@/lib/db/supabase';

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

export const proveedoresService = {
  async getAll(page = 1, limit = 50) {
    try {
      if (!supabaseAdmin) {
        return { data: [], count: 0, error: 'Admin client not available' };
      }
      
      const start = (page - 1) * limit;
      
      const { data, error, count } = await supabaseAdmin
        .from('proveedores')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(start, start + limit - 1);
      
      if (error) {
        console.error('Supabase error in getAll:', error);
        return { data: [], count: 0, error: error.message || 'Database error' };
      }
      
      return { data: data || [], count: count || 0, error: null };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Exception in getAll:', message);
      return { data: [], count: 0, error: message };
    }
  },

  async search(query: string, limit = 50) {
    try {
      if (!supabaseAdmin) throw new Error('Admin client not available');
      
      const { data, error } = await supabaseAdmin
        .from('proveedores')
        .select('*')
        .or(`nombre.ilike.%${query}%,email.ilike.%${query}%,persona_contacto.ilike.%${query}%`)
        .limit(limit);
      
      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error) {
      return { data: [], error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  async getByCountry(country: string, page = 1, limit = 50) {
    try {
      if (!supabaseAdmin) {
        return { data: [], count: 0, error: 'Admin client not available' };
      }
      
      const start = (page - 1) * limit;
      
      const { data, error, count } = await supabaseAdmin
        .from('proveedores')
        .select('*', { count: 'exact' })
        .eq('país', country)
        .order('created_at', { ascending: false })
        .range(start, start + limit - 1);
      
      if (error) {
        return { data: [], count: 0, error: error.message || 'Database error' };
      }
      return { data: data || [], count: count || 0, error: null };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { data: [], count: 0, error: message };
    }
  },

  async getById(id: string) {
    try {
      if (!supabaseAdmin) throw new Error('Admin client not available');
      
      const { data, error } = await supabaseAdmin
        .from('proveedores')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  async create(proveedor: Partial<Proveedor>) {
    try {
      if (!supabaseAdmin) throw new Error('Admin client not available');
      
      const { data, error } = await supabaseAdmin
        .from('proveedores')
        .insert([proveedor])
        .select()
        .single();
      
      if (error) throw error;
      return { data };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  async update(id: string, proveedor: Partial<Proveedor>) {
    try {
      if (!supabaseAdmin) throw new Error('Admin client not available');
      
      const { data, error } = await supabaseAdmin
        .from('proveedores')
        .update(proveedor)
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
        .from('proveedores')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },
};
