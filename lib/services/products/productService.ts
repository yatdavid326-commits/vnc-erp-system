import { supabase } from '@/lib/db/supabase';
import { PostgrestError } from '@supabase/supabase-js';

export interface Producto {
  id?: string;
  sku: string;
  nombre: string;
  descripcion?: string;
  categoria: string;
  costo_unitario: number;
  precio_venta: number;
  cantidad_stock: number;
  stock_minimo: number;
  proveedor_id?: string;
  created_at?: string;
  updated_at?: string;
}

class ProductService {
  async getAll(page = 1, limit = 50): Promise<{ data: any[]; count: number; error: PostgrestError | null }> {
    try {
      const start = (page - 1) * limit;
      const { data, error, count } = await supabase
        .from('products')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(start, start + limit - 1);

      return { data: data || [], count: count || 0, error };
    } catch (error) {
      throw error;
    }
  }

  async getById(id: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      throw error;
    }
  }

  async search(query: string, limit = 20): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .or(`name.ilike.%${query}%,sku.ilike.%${query}%`)
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      throw error;
    }
  }

  async create(product: any): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('products')
        .insert([product])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      throw error;
    }
  }

  async update(id: string, product: Partial<any>): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('products')
        .update(product)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      throw error;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      throw error;
    }
  }

  async updateStock(id: string, quantity: number): Promise<any> {
    try {
      const product = await this.getById(id);
      const newStock = (product.quantity_stock || 0) + quantity;

      return await this.update(id, { quantity_stock: Math.max(0, newStock) });
    } catch (error) {
      throw error;
    }
  }

  async getLowStockProducts(limit = 50): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .lt('quantity_stock', 'stock_minimum')
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      return [];
    }
  }
}

export const productService = new ProductService();
