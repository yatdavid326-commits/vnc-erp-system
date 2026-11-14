import { supabase } from '@/lib/db/supabase';
import { PostgrestError } from '@supabase/supabase-js';

export interface Cliente {
  id?: string;
  nombre: string;
  email: string;
  telefono?: string;
  direccion?: string;
  ciudad?: string;
  estado?: string;
  codigo_postal?: string;
  tipo: 'retail' | 'wholesale' | 'business';
  limite_credito?: number;
  saldo_actual?: number;
  estado_cliente: 'activo' | 'inactivo' | 'suspendido';
  created_at?: string;
  updated_at?: string;
}

export interface CreditTransaction {
  id?: string;
  cliente_id: string;
  monto: number;
  tipo: 'compra' | 'pago' | 'ajuste';
  descripcion?: string;
  fecha: string;
  created_at?: string;
}

class CustomerService {
  async getAll(page = 1, limit = 50): Promise<{ data: Cliente[]; error: PostgrestError | null; count: number }> {
    try {
      const start = (page - 1) * limit;
      const end = start + limit - 1;

      const { data, error, count } = await supabase
        .from('clientes')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(start, end);

      return { data: data || [], error, count: count || 0 };
    } catch (error) {
      throw error;
    }
  }

  async getById(id: string): Promise<Cliente | null> {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as Cliente;
    } catch (error) {
      throw error;
    }
  }

  async search(query: string, limit = 20): Promise<Cliente[]> {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .or(`nombre.ilike.%${query}%,email.ilike.%${query}%,telefono.ilike.%${query}%`)
        .limit(limit);

      if (error) throw error;
      return (data || []) as Cliente[];
    } catch (error) {
      throw error;
    }
  }

  async create(cliente: Cliente): Promise<Cliente> {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .insert([{
          nombre: cliente.nombre,
          email: cliente.email,
          telefono: cliente.telefono || '',
          direccion: cliente.direccion || '',
          ciudad: cliente.ciudad || '',
          estado: cliente.estado || '',
          codigo_postal: cliente.codigo_postal || '',
          tipo: cliente.tipo,
          limite_credito: cliente.limite_credito || 0,
          saldo_actual: cliente.saldo_actual || 0,
          estado_cliente: cliente.estado_cliente,
        }])
        .select()
        .single();

      if (error) throw error;
      return data as Cliente;
    } catch (error) {
      throw error;
    }
  }

  async update(id: string, cliente: Partial<Cliente>): Promise<Cliente> {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .update({
          ...(cliente.nombre && { nombre: cliente.nombre }),
          ...(cliente.email && { email: cliente.email }),
          ...(cliente.telefono !== undefined && { telefono: cliente.telefono }),
          ...(cliente.direccion !== undefined && { direccion: cliente.direccion }),
          ...(cliente.ciudad !== undefined && { ciudad: cliente.ciudad }),
          ...(cliente.estado !== undefined && { estado: cliente.estado }),
          ...(cliente.codigo_postal !== undefined && { codigo_postal: cliente.codigo_postal }),
          ...(cliente.tipo && { tipo: cliente.tipo }),
          ...(cliente.limite_credito !== undefined && { limite_credito: cliente.limite_credito }),
          ...(cliente.estado_cliente && { estado_cliente: cliente.estado_cliente }),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Cliente;
    } catch (error) {
      throw error;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('clientes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      throw error;
    }
  }

  // Credit Management Functions
  async getCreditBalance(clienteId: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('saldo_actual')
        .eq('id', clienteId)
        .single();

      if (error) throw error;
      return data?.saldo_actual || 0;
    } catch (error) {
      throw error;
    }
  }

  async updateCreditBalance(clienteId: string, amount: number): Promise<number> {
    try {
      const currentBalance = await this.getCreditBalance(clienteId);
      const newBalance = currentBalance + amount;

      const { data, error } = await supabase
        .from('clientes')
        .update({ saldo_actual: newBalance })
        .eq('id', clienteId)
        .select('saldo_actual')
        .single();

      if (error) throw error;
      return data?.saldo_actual || 0;
    } catch (error) {
      throw error;
    }
  }

  async addCreditTransaction(transaction: CreditTransaction): Promise<CreditTransaction> {
    try {
      const { data, error } = await supabase
        .from('credit_transactions')
        .insert([transaction])
        .select()
        .single();

      if (error) throw error;
      
      // Update the cliente's saldo_actual
      const monto = transaction.tipo === 'pago' ? -transaction.monto : transaction.monto;
      await this.updateCreditBalance(transaction.cliente_id, monto);

      return data as CreditTransaction;
    } catch (error) {
      throw error;
    }
  }

  async getCreditTransactions(clienteId: string, limit = 100): Promise<CreditTransaction[]> {
    try {
      const { data, error } = await supabase
        .from('credit_transactions')
        .select('*')
        .eq('cliente_id', clienteId)
        .order('fecha', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data || []) as CreditTransaction[];
    } catch (error) {
      throw error;
    }
  }

  async isCreditAvailable(clienteId: string, amount: number): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('saldo_actual, limite_credito')
        .eq('id', clienteId)
        .single();

      if (error) throw error;
      
      const { saldo_actual = 0, limite_credito = 0 } = data || {};
      const availableCredit = limite_credito - saldo_actual;
      
      return availableCredit >= amount;
    } catch (error) {
      throw error;
    }
  }

  async getCustomersByType(type: 'retail' | 'wholesale' | 'business', page = 1, limit = 50): Promise<{ data: Cliente[]; error: PostgrestError | null }> {
    try {
      const start = (page - 1) * limit;
      const end = start + limit - 1;

      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('tipo', type)
        .order('created_at', { ascending: false })
        .range(start, end);

      return { data: data || [], error };
    } catch (error) {
      throw error;
    }
  }

  async getHighCreditRiskCustomers(riskThreshold = 0.8): Promise<Cliente[]> {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .filter('saldo_actual', 'gte', supabase.rpc('get_credit_limit_multiply', { risk: riskThreshold }));

      if (error) throw error;
      return (data || []) as Cliente[];
    } catch (error) {
      return [] as Cliente[];
    }
  }
}

export const customerService = new CustomerService();
