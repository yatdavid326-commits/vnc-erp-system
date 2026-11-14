import { createAdminClient } from '@/lib/db/supabase';

export interface CompraUI {
  id: string;
  numero_po: string;
  proveedor_id: string;
  fecha_orden: string;
  fecha_entrega_esperada: string;
  estado: string;
  monto_total: number;
  created_at: string;
  updated_at: string;
}

interface CompraDB {
  id: string;
  po_number: string;
  supplier_id: string;
  order_date: string;
  expected_delivery_date: string;
  status: string;
  total_amount: number;
  created_at: string;
  updated_at: string;
}

export interface CompraItemUI {
  id: string;
  po_id: string;
  product_id: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

interface CompraItemDB {
  id: string;
  purchase_order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

class ComprasService {
  private static instance: ComprasService;

  private constructor() {}

  static getInstance(): ComprasService {
    if (!ComprasService.instance) {
      ComprasService.instance = new ComprasService();
    }
    return ComprasService.instance;
  }

  private mapDBToUI(compra: CompraDB): CompraUI {
    return {
      id: compra.id,
      numero_po: compra.po_number,
      proveedor_id: compra.supplier_id,
      fecha_orden: compra.order_date,
      fecha_entrega_esperada: compra.expected_delivery_date,
      estado: compra.status,
      monto_total: compra.total_amount,
      created_at: compra.created_at,
      updated_at: compra.updated_at,
    };
  }

  private mapUIToDB(compra: Partial<CompraUI>): Partial<CompraDB> {
    return {
      po_number: compra.numero_po,
      supplier_id: compra.proveedor_id,
      order_date: compra.fecha_orden,
      expected_delivery_date: compra.fecha_entrega_esperada,
      status: compra.estado,
      total_amount: compra.monto_total,
    };
  }

  private mapItemDBToUI(item: CompraItemDB): CompraItemUI {
    return {
      id: item.id,
      po_id: item.purchase_order_id,
      product_id: item.product_id,
      cantidad: item.quantity,
      precio_unitario: item.unit_price,
      subtotal: item.subtotal,
    };
  }

  private mapItemUIToDB(item: Partial<CompraItemUI>): Partial<CompraItemDB> {
    return {
      purchase_order_id: item.po_id,
      product_id: item.product_id,
      quantity: item.cantidad,
      unit_price: item.precio_unitario,
      subtotal: item.subtotal,
    };
  }

  async getAll(page = 1, limit = 50) {
    try {
      const supabase = createAdminClient();
      if (!supabase) throw new Error('Supabase admin client not available');

      const offset = (page - 1) * limit;

      const { data, error, count } = await supabase
        .from('purchase_orders')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      return {
        data: data ? data.map(c => this.mapDBToUI(c as CompraDB)) : [],
        count: count || 0,
        error: null,
      };
    } catch (error) {
      console.error('ComprasService.getAll error:', error);
      return { data: [], count: 0, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async getById(id: string) {
    try {
      const supabase = createAdminClient();
      if (!supabase) throw new Error('Supabase admin client not available');

      const { data, error } = await supabase
        .from('purchase_orders')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      return {
        data: data ? this.mapDBToUI(data as CompraDB) : null,
        error: null,
      };
    } catch (error) {
      console.error('ComprasService.getById error:', error);
      return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async create(compra: Omit<CompraUI, 'id' | 'created_at' | 'updated_at'>) {
    try {
      const supabase = createAdminClient();
      if (!supabase) throw new Error('Supabase admin client not available');

      const dbData = this.mapUIToDB(compra);

      const { data, error } = await supabase
        .from('purchase_orders')
        .insert([dbData])
        .select()
        .single();

      if (error) throw error;

      return {
        data: data ? this.mapDBToUI(data as CompraDB) : null,
        error: null,
      };
    } catch (error) {
      console.error('ComprasService.create error:', error);
      return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async update(id: string, compra: Partial<CompraUI>) {
    try {
      const supabase = createAdminClient();
      if (!supabase) throw new Error('Supabase admin client not available');

      const dbData = this.mapUIToDB(compra);

      const { data, error } = await supabase
        .from('purchase_orders')
        .update(dbData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return {
        data: data ? this.mapDBToUI(data as CompraDB) : null,
        error: null,
      };
    } catch (error) {
      console.error('ComprasService.update error:', error);
      return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async delete(id: string) {
    try {
      const supabase = createAdminClient();
      if (!supabase) throw new Error('Supabase admin client not available');

      const { error } = await supabase
        .from('purchase_orders')
        .delete()
        .eq('id', id);

      if (error) throw error;

      return { error: null };
    } catch (error) {
      console.error('ComprasService.delete error:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async search(query: string, limit = 50) {
    try {
      const supabase = createAdminClient();
      if (!supabase) throw new Error('Supabase admin client not available');

      const { data, error } = await supabase
        .from('purchase_orders')
        .select('*')
        .or(`po_number.ilike.%${query}%`)
        .limit(limit);

      if (error) throw error;

      return data ? data.map(c => this.mapDBToUI(c as CompraDB)) : [];
    } catch (error) {
      console.error('ComprasService.search error:', error);
      return [];
    }
  }

  async getItems(poId: string) {
    try {
      const supabase = createAdminClient();
      if (!supabase) throw new Error('Supabase admin client not available');

      const { data, error } = await supabase
        .from('purchase_order_items')
        .select('*')
        .eq('purchase_order_id', poId);

      if (error) throw error;

      return {
        data: data ? data.map(i => this.mapItemDBToUI(i as CompraItemDB)) : [],
        error: null,
      };
    } catch (error) {
      console.error('ComprasService.getItems error:', error);
      return { data: [], error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async addItem(item: Omit<CompraItemUI, 'id'>) {
    try {
      const supabase = createAdminClient();
      if (!supabase) throw new Error('Supabase admin client not available');

      const dbData = this.mapItemUIToDB(item);

      const { data, error } = await supabase
        .from('purchase_order_items')
        .insert([dbData])
        .select()
        .single();

      if (error) throw error;

      return {
        data: data ? this.mapItemDBToUI(data as CompraItemDB) : null,
        error: null,
      };
    } catch (error) {
      console.error('ComprasService.addItem error:', error);
      return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async removeItem(itemId: string) {
    try {
      const supabase = createAdminClient();
      if (!supabase) throw new Error('Supabase admin client not available');

      const { error } = await supabase
        .from('purchase_order_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      return { error: null };
    } catch (error) {
      console.error('ComprasService.removeItem error:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async markReceived(id: string) {
    try {
      const supabase = createAdminClient();
      if (!supabase) throw new Error('Supabase admin client not available');

      const { data, error } = await supabase
        .from('purchase_orders')
        .update({ status: 'received' })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return {
        data: data ? this.mapDBToUI(data as CompraDB) : null,
        error: null,
      };
    } catch (error) {
      console.error('ComprasService.markReceived error:', error);
      return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}

export const comprasService = ComprasService.getInstance();
