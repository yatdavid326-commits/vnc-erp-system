import { createAdminClient } from '@/lib/db/supabase';

export interface VentaUI {
  id: string;
  fecha_venta: string;
  cliente_id: string;
  monto_total: number;
  metodo_pago: string;
  estado: string;
  created_at: string;
  updated_at: string;
}

interface VentaDB {
  id: string;
  sales_date: string;
  customer_id: string;
  total_amount: number;
  payment_method: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface VentaItemUI {
  id: string;
  venta_id: string;
  product_id: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

interface VentaItemDB {
  id: string;
  sale_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

class POSService {
  private static instance: POSService;

  private constructor() {}

  static getInstance(): POSService {
    if (!POSService.instance) {
      POSService.instance = new POSService();
    }
    return POSService.instance;
  }

  private mapDBToUI(venta: VentaDB): VentaUI {
    return {
      id: venta.id,
      fecha_venta: venta.sales_date,
      cliente_id: venta.customer_id,
      monto_total: venta.total_amount,
      metodo_pago: venta.payment_method,
      estado: venta.status,
      created_at: venta.created_at,
      updated_at: venta.updated_at,
    };
  }

  private mapUIToDB(venta: Partial<VentaUI>): Partial<VentaDB> {
    return {
      sales_date: venta.fecha_venta,
      customer_id: venta.cliente_id,
      total_amount: venta.monto_total,
      payment_method: venta.metodo_pago,
      status: venta.estado,
    };
  }

  async getAll(page = 1, limit = 50) {
    try {
      const supabase = createAdminClient();
      if (!supabase) throw new Error('Supabase admin client not available');

      const offset = (page - 1) * limit;

      const { data, error, count } = await supabase
        .from('sales')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      return {
        data: data ? data.map(v => this.mapDBToUI(v as VentaDB)) : [],
        count: count || 0,
        error: null,
      };
    } catch (error) {
      console.error('POSService.getAll error:', error);
      return { data: [], count: 0, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async getById(id: string) {
    try {
      const supabase = createAdminClient();
      if (!supabase) throw new Error('Supabase admin client not available');

      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      return {
        data: data ? this.mapDBToUI(data as VentaDB) : null,
        error: null,
      };
    } catch (error) {
      console.error('POSService.getById error:', error);
      return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async create(venta: Omit<VentaUI, 'id' | 'created_at' | 'updated_at'>) {
    try {
      const supabase = createAdminClient();
      if (!supabase) throw new Error('Supabase admin client not available');

      const dbData = this.mapUIToDB(venta);

      const { data, error } = await supabase
        .from('sales')
        .insert([dbData])
        .select()
        .single();

      if (error) throw error;

      return {
        data: data ? this.mapDBToUI(data as VentaDB) : null,
        error: null,
      };
    } catch (error) {
      console.error('POSService.create error:', error);
      return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async addItem(item: Omit<VentaItemUI, 'id'>) {
    try {
      const supabase = createAdminClient();
      if (!supabase) throw new Error('Supabase admin client not available');

      const dbData = {
        sale_id: item.venta_id,
        product_id: item.product_id,
        quantity: item.cantidad,
        unit_price: item.precio_unitario,
        subtotal: item.subtotal,
      };

      const { data, error } = await supabase
        .from('sale_items')
        .insert([dbData])
        .select()
        .single();

      if (error) throw error;

      return {
        data: data
          ? {
              id: (data as any).id,
              venta_id: (data as any).sale_id,
              product_id: (data as any).product_id,
              cantidad: (data as any).quantity,
              precio_unitario: (data as any).unit_price,
              subtotal: (data as any).subtotal,
            }
          : null,
        error: null,
      };
    } catch (error) {
      console.error('POSService.addItem error:', error);
      return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async getItems(ventaId: string) {
    try {
      const supabase = createAdminClient();
      if (!supabase) throw new Error('Supabase admin client not available');

      const { data, error } = await supabase
        .from('sale_items')
        .select('*')
        .eq('sale_id', ventaId);

      if (error) throw error;

      return {
        data: data
          ? data.map((i: any) => ({
              id: i.id,
              venta_id: i.sale_id,
              product_id: i.product_id,
              cantidad: i.quantity,
              precio_unitario: i.unit_price,
              subtotal: i.subtotal,
            }))
          : [],
        error: null,
      };
    } catch (error) {
      console.error('POSService.getItems error:', error);
      return { data: [], error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async removeItem(itemId: string) {
    try {
      const supabase = createAdminClient();
      if (!supabase) throw new Error('Supabase admin client not available');

      const { error } = await supabase
        .from('sale_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      return { error: null };
    } catch (error) {
      console.error('POSService.removeItem error:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async updateTotal(id: string, total: number) {
    try {
      const supabase = createAdminClient();
      if (!supabase) throw new Error('Supabase admin client not available');

      const { data, error } = await supabase
        .from('sales')
        .update({ total_amount: total })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return {
        data: data ? this.mapDBToUI(data as VentaDB) : null,
        error: null,
      };
    } catch (error) {
      console.error('POSService.updateTotal error:', error);
      return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}

export const posService = POSService.getInstance();
