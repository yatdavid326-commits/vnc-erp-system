import { createAdminClient } from '@/lib/db/supabase';

export interface CajaUI {
  id: string;
  fecha_apertura: string;
  fecha_cierre: string | null;
  saldo_inicial: number;
  saldo_final: number | null;
  usuario_id: string;
  estado: string;
  created_at: string;
  updated_at: string;
}

interface CajaDB {
  id: string;
  opening_date: string;
  closing_date: string | null;
  opening_balance: number;
  closing_balance: number | null;
  user_id: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface MovimientoCajaUI {
  id: string;
  caja_id: string;
  tipo: string;
  monto: number;
  descripcion: string;
  created_at: string;
}

interface MovimientoCajaDB {
  id: string;
  cash_register_id: string;
  type: string;
  amount: number;
  description: string;
  created_at: string;
}

class CajaService {
  private static instance: CajaService;

  private constructor() {}

  static getInstance(): CajaService {
    if (!CajaService.instance) {
      CajaService.instance = new CajaService();
    }
    return CajaService.instance;
  }

  private mapDBToUI(caja: CajaDB): CajaUI {
    return {
      id: caja.id,
      fecha_apertura: caja.opening_date,
      fecha_cierre: caja.closing_date,
      saldo_inicial: caja.opening_balance,
      saldo_final: caja.closing_balance,
      usuario_id: caja.user_id,
      estado: caja.status,
      created_at: caja.created_at,
      updated_at: caja.updated_at,
    };
  }

  async openCash(userId: string, initialBalance: number) {
    try {
      const supabase = createAdminClient();
      if (!supabase) throw new Error('Supabase admin client not available');

      const { data, error } = await supabase
        .from('cash_registers')
        .insert([
          {
            opening_date: new Date().toISOString(),
            opening_balance: initialBalance,
            user_id: userId,
            status: 'open',
          },
        ])
        .select()
        .single();

      if (error) throw error;

      return {
        data: data ? this.mapDBToUI(data as CajaDB) : null,
        error: null,
      };
    } catch (error) {
      console.error('CajaService.openCash error:', error);
      return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async closeCash(id: string, finalBalance: number) {
    try {
      const supabase = createAdminClient();
      if (!supabase) throw new Error('Supabase admin client not available');

      const { data, error } = await supabase
        .from('cash_registers')
        .update({
          closing_date: new Date().toISOString(),
          closing_balance: finalBalance,
          status: 'closed',
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return {
        data: data ? this.mapDBToUI(data as CajaDB) : null,
        error: null,
      };
    } catch (error) {
      console.error('CajaService.closeCash error:', error);
      return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async recordMovement(
    cajaId: string,
    tipo: string,
    monto: number,
    descripcion: string
  ) {
    try {
      const supabase = createAdminClient();
      if (!supabase) throw new Error('Supabase admin client not available');

      const { data, error } = await supabase
        .from('cash_movements')
        .insert([
          {
            cash_register_id: cajaId,
            type: tipo,
            amount: monto,
            description: descripcion,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      return {
        data: data
          ? {
              id: (data as any).id,
              caja_id: (data as any).cash_register_id,
              tipo: (data as any).type,
              monto: (data as any).amount,
              descripcion: (data as any).description,
              created_at: (data as any).created_at,
            }
          : null,
        error: null,
      };
    } catch (error) {
      console.error('CajaService.recordMovement error:', error);
      return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async getMovements(cajaId: string) {
    try {
      const supabase = createAdminClient();
      if (!supabase) throw new Error('Supabase admin client not available');

      const { data, error } = await supabase
        .from('cash_movements')
        .select('*')
        .eq('cash_register_id', cajaId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return {
        data: data
          ? data.map((m: any) => ({
              id: m.id,
              caja_id: m.cash_register_id,
              tipo: m.type,
              monto: m.amount,
              descripcion: m.description,
              created_at: m.created_at,
            }))
          : [],
        error: null,
      };
    } catch (error) {
      console.error('CajaService.getMovements error:', error);
      return { data: [], error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async getActiveCash() {
    try {
      const supabase = createAdminClient();
      if (!supabase) throw new Error('Supabase admin client not available');

      const { data, error } = await supabase
        .from('cash_registers')
        .select('*')
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      return {
        data:
          data && data.length > 0
            ? this.mapDBToUI(data[0] as CajaDB)
            : null,
        error: null,
      };
    } catch (error) {
      console.error('CajaService.getActiveCash error:', error);
      return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async getHistory(page = 1, limit = 50) {
    try {
      const supabase = createAdminClient();
      if (!supabase) throw new Error('Supabase admin client not available');

      const offset = (page - 1) * limit;

      const { data, error, count } = await supabase
        .from('cash_registers')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      return {
        data: data ? data.map(c => this.mapDBToUI(c as CajaDB)) : [],
        count: count || 0,
        error: null,
      };
    } catch (error) {
      console.error('CajaService.getHistory error:', error);
      return { data: [], count: 0, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}

export const cajaService = CajaService.getInstance();
