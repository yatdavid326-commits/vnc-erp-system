import { supabaseAdmin } from '@/lib/db/supabase';

export interface POSItem {
  id: string;
  producto_id: string;
  cliente_id: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  created_at: string;
  updated_at?: string;
}

export interface POSTransaction {
  id: string;
  numero_transaccion: string;
  usuario_id: string;
  cliente_id?: string;
  monto_total: number;
  monto_pagado: number;
  cambio?: number;
  metodo_pago: string;
  estado: string;
  created_at: string;
  updated_at?: string;
}

export const posService = {
  async getAll(page = 1, limit = 50) {
    try {
      if (!supabaseAdmin) throw new Error('Admin client not available');
      
      const start = (page - 1) * limit;
      
      const { data, error, count } = await supabaseAdmin
        .from('pos_transacciones')
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
        .from('pos_transacciones')
        .select('*')
        .or(`numero_transaccion.ilike.%${query}%,metodo_pago.ilike.%${query}%`)
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
        .from('pos_transacciones')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  async create(transaction: Partial<POSTransaction>) {
    try {
      if (!supabaseAdmin) throw new Error('Admin client not available');
      
      const { data, error } = await supabaseAdmin
        .from('pos_transacciones')
        .insert([transaction])
        .select()
        .single();
      
      if (error) throw error;
      return { data };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  async update(id: string, transaction: Partial<POSTransaction>) {
    try {
      if (!supabaseAdmin) throw new Error('Admin client not available');
      
      const { data, error } = await supabaseAdmin
        .from('pos_transacciones')
        .update(transaction)
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
        .from('pos_transacciones')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },
};
