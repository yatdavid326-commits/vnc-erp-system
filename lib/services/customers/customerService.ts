import { supabaseAdmin } from '@/lib/db/supabase';
import type { PostgrestError } from '@supabase/supabase-js';
import { sanitizePostgrestSearch } from '@/lib/utils/search';

function getSupabaseAdmin() {
  if (!supabaseAdmin) {
    throw new Error('Server configuration error');
  }
  return supabaseAdmin;
}

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

// Database model (from Supabase)
export interface Customer {
  id?: string;
  customer_number?: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  customer_type: 'retail' | 'wholesale' | 'business';
  credit_limit?: number;
  current_balance?: number;
  status: 'activo' | 'inactivo' | 'suspendido';
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CreditTransaction {
  id: string;
  cliente_id: string;
  monto: number;
  tipo: 'compra' | 'pago' | 'ajuste';
  descripcion?: string;
  fecha: string;
  created_at?: string;
  created_by?: string;
}

export class CreditTransactionError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

// Helper functions to map between UI and database formats
function clienteToCustomer(cliente: Cliente): Partial<Customer> {
  return {
    name: cliente.nombre,
    email: cliente.email,
    phone: cliente.telefono,
    address: cliente.direccion,
    city: cliente.ciudad,
    state: cliente.estado,
    postal_code: cliente.codigo_postal,
    country: 'Guatemala',
    customer_type: cliente.tipo,
    credit_limit: cliente.limite_credito,
    current_balance: cliente.saldo_actual,
    status: cliente.estado_cliente,
    is_active: cliente.estado_cliente === 'activo',
  };
}

function customerToCliente(customer: Customer): Cliente {
  return {
    id: customer.id,
    nombre: customer.name,
    email: customer.email,
    telefono: customer.phone,
    direccion: customer.address,
    ciudad: customer.city,
    estado: customer.state,
    codigo_postal: customer.postal_code,
    tipo: customer.customer_type || 'retail',
    limite_credito: customer.credit_limit || 0,
    saldo_actual: customer.current_balance || 0,
    estado_cliente: customer.status || (customer.is_active ? 'activo' : 'inactivo'),
    created_at: customer.created_at,
    updated_at: customer.updated_at,
  };
}

class CustomerService {
  async getAll(
    page = 1,
    limit = 50,
    filters: {
      search?: string;
      status?: Cliente['estado_cliente'];
      type?: Cliente['tipo'];
    } = {}
  ): Promise<{ data: Cliente[]; error: PostgrestError | null; count: number }> {
    try {
      const start = (page - 1) * limit;
      const end = start + limit - 1;

      let query = getSupabaseAdmin()
        .from('customers')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .order('id', { ascending: false });

      const safeSearch = sanitizePostgrestSearch(filters.search ?? '');
      if (safeSearch) {
        query = query.or(
          `name.ilike.%${safeSearch}%,email.ilike.%${safeSearch}%,phone.ilike.%${safeSearch}%`
        );
      }
      if (filters.status) query = query.eq('status', filters.status);
      if (filters.type) query = query.eq('customer_type', filters.type);

      const { data, error, count } = await query.range(start, end);

      const clientes = (data || []).map(customerToCliente);
      return { data: clientes, error, count: count || 0 };
    } catch (error) {
      throw error;
    }
  }

  async getById(id: string): Promise<Cliente | null> {
    try {
      const { data, error } = await getSupabaseAdmin()
        .from('customers')
        .select('*')
        .eq('id', id)
        .single();

      if (error?.code === 'PGRST116') return null;
      if (error) throw error;
      return data ? customerToCliente(data) : null;
    } catch (error) {
      throw error;
    }
  }

  async search(query: string, limit = 20): Promise<Cliente[]> {
    try {
      const safeSearch = sanitizePostgrestSearch(query);
      const { data, error } = await getSupabaseAdmin()
        .from('customers')
        .select('*')
        .or(`name.ilike.%${safeSearch}%,email.ilike.%${safeSearch}%,phone.ilike.%${safeSearch}%`)
        .limit(limit);

      if (error) throw error;
      return (data || []).map(customerToCliente);
    } catch (error) {
      throw error;
    }
  }

  async create(cliente: Cliente): Promise<Cliente> {
    try {
      const customerData = clienteToCustomer(cliente);
      
      const { data, error } = await getSupabaseAdmin()
        .from('customers')
        .insert([customerData])
        .select()
        .single();

      if (error) throw error;
      return customerToCliente(data);
    } catch (error) {
      throw error;
    }
  }

  async update(id: string, cliente: Partial<Cliente>): Promise<Cliente | null> {
    try {
      const updateData: Partial<Customer> = {};
      
      if (cliente.nombre) updateData.name = cliente.nombre;
      if (cliente.email) updateData.email = cliente.email;
      if (cliente.telefono !== undefined) updateData.phone = cliente.telefono;
      if (cliente.direccion !== undefined) updateData.address = cliente.direccion;
      if (cliente.ciudad !== undefined) updateData.city = cliente.ciudad;
      if (cliente.estado !== undefined) updateData.state = cliente.estado;
      if (cliente.codigo_postal !== undefined) updateData.postal_code = cliente.codigo_postal;
      if (cliente.tipo) updateData.customer_type = cliente.tipo;
      if (cliente.limite_credito !== undefined) updateData.credit_limit = cliente.limite_credito;
      if (cliente.estado_cliente) {
        updateData.status = cliente.estado_cliente;
        updateData.is_active = cliente.estado_cliente === 'activo';
      }

      const { data, error } = await getSupabaseAdmin()
        .from('customers')
        .update(updateData)
        .eq('id', id)
        .select()
        .maybeSingle();

      if (error) throw error;
      return data ? customerToCliente(data) : null;
    } catch (error) {
      throw error;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const { data, error } = await getSupabaseAdmin()
        .from('customers')
        .delete()
        .eq('id', id)
        .select('id')
        .maybeSingle();

      if (error) throw error;
      return data !== null;
    } catch (error) {
      throw error;
    }
  }

  // Credit Management Functions
  async getCreditBalance(clienteId: string): Promise<number> {
    try {
      const { data, error } = await getSupabaseAdmin()
        .from('customers')
        .select('current_balance')
        .eq('id', clienteId)
        .single();

      if (error) throw error;
      return data?.current_balance || 0;
    } catch (error) {
      throw error;
    }
  }

  async addCreditTransaction(transaction: CreditTransaction, userId: string): Promise<CreditTransaction> {
    const { data, error } = await getSupabaseAdmin().rpc('create_credit_transaction', {
      p_id: transaction.id,
      p_cliente_id: transaction.cliente_id,
      p_monto: transaction.monto,
      p_tipo: transaction.tipo,
      p_descripcion: transaction.descripcion ?? null,
      p_fecha: transaction.fecha,
      p_created_by: userId,
    }).single();
    if (error) {
      const errors: Record<string, [string, number]> = {
        CUSTOMER_NOT_FOUND: ['Cliente no encontrado.', 404],
        INSUFFICIENT_BALANCE: ['El movimiento no puede reducir la deuda por debajo de cero.', 409],
        CREDIT_LIMIT_EXCEEDED: ['La compra supera el límite de crédito.', 409],
        IDEMPOTENCY_CONFLICT: ['El identificador del movimiento ya se usó con otros datos.', 409],
        INVALID_TRANSACTION: ['Los datos del movimiento no son válidos.', 400],
        BALANCE_TOO_LARGE: ['El saldo excede el máximo permitido.', 409],
      };
      const known = errors[error.message];
      if (known) throw new CreditTransactionError(known[0], known[1]);
      if (error.code === '23505') throw new CreditTransactionError('El identificador del movimiento ya está en uso.', 409);
      throw error;
    }
    return data as CreditTransaction;
  }

  async getCreditTransactions(clienteId: string, limit = 100): Promise<CreditTransaction[]> {
    try {
      const { data, error } = await getSupabaseAdmin()
        .from('credit_transactions')
        .select('*')
        .eq('cliente_id', clienteId)
        .order('fecha', { ascending: false })
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data || []) as CreditTransaction[];
    } catch (error) {
      throw error;
    }
  }

  async isCreditAvailable(clienteId: string, amount: number): Promise<boolean> {
    try {
      const { data, error } = await getSupabaseAdmin()
        .from('customers')
        .select('current_balance, credit_limit')
        .eq('id', clienteId)
        .single();

      if (error) throw error;
      
      const { current_balance = 0, credit_limit = 0 } = data || {};
      const availableCredit = credit_limit - current_balance;
      
      return availableCredit >= amount;
    } catch (error) {
      throw error;
    }
  }

  async getCustomersByType(type: 'retail' | 'wholesale' | 'business', page = 1, limit = 50): Promise<{ data: Cliente[]; error: PostgrestError | null }> {
    try {
      const start = (page - 1) * limit;
      const end = start + limit - 1;

      const { data, error } = await getSupabaseAdmin()
        .from('customers')
        .select('*')
        .eq('customer_type', type)
        .order('created_at', { ascending: false })
        .range(start, end);

      const clientes = (data || []).map(customerToCliente);
      return { data: clientes, error };
    } catch (error) {
      throw error;
    }
  }

  async getHighCreditRiskCustomers(riskThreshold = 0.8): Promise<Cliente[]> {
    try {
      const { data, error } = await getSupabaseAdmin()
        .from('customers')
        .select('*')
        .filter('current_balance', 'gte', getSupabaseAdmin().rpc('get_credit_limit_multiply', { risk: riskThreshold }));

      if (error) throw error;
      return (data || []).map(customerToCliente);
    } catch (error) {
      throw error;
    }
  }
}

export const customerService = new CustomerService();
