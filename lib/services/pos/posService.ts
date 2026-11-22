import { supabaseAdmin } from '@/lib/db/supabase';
import { sanitizePostgrestSearch } from '@/lib/utils/search';

export interface POSCatalogProduct {
  inventory_id: string;
  product_id: string;
  product_code: string;
  name: string;
  selling_price: number;
  available_quantity: number;
}

export interface POSCheckoutItem {
  inventory_id: string;
  quantity: number;
}

export interface POSCheckoutInput {
  customer_id: string | null;
  payment_method: 'efectivo' | 'tarjeta' | 'cheque';
  amount_paid: number;
  items: POSCheckoutItem[];
}

export interface CashRegister {
  id: string;
  cashier_id: string;
  opening_balance: number;
  closing_balance: number | null;
  opened_at: string;
  closed_at: string | null;
  status: string;
}

export class PosServiceError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = 'PosServiceError';
  }
}

interface ProductWithInventoryRow {
  id: string;
  product_code: string;
  name: string;
  selling_price: number | string;
  inventory:
    | {
        id: string;
        quantity_on_hand: number | null;
        quantity_reserved: number | null;
      }
    | Array<{
        id: string;
        quantity_on_hand: number | null;
        quantity_reserved: number | null;
      }>
    | null;
}

const checkoutErrors: Record<string, { message: string; status: number }> = {
  NO_OPEN_REGISTER: {
    message: 'Abre una caja antes de procesar ventas.',
    status: 409,
  },
  INVALID_USER: {
    message: 'El perfil del usuario no está activo.',
    status: 403,
  },
  INVALID_CUSTOMER: {
    message: 'El cliente no existe o está inactivo.',
    status: 400,
  },
  INVALID_PAYMENT_METHOD: {
    message: 'El método de pago no es válido.',
    status: 400,
  },
  PAYMENT_TOO_LOW: {
    message: 'El efectivo recibido no cubre el total de la venta.',
    status: 400,
  },
  INVALID_ITEMS: {
    message: 'Agrega artículos válidos con cantidades mayores que cero.',
    status: 400,
  },
  DUPLICATE_ITEMS: {
    message: 'Cada producto debe aparecer una sola vez en el carrito.',
    status: 400,
  },
  INSUFFICIENT_STOCK: {
    message: 'La existencia disponible no cubre una o más cantidades.',
    status: 409,
  },
  PRODUCT_NOT_AVAILABLE: {
    message: 'Uno o más productos ya no están disponibles para la venta.',
    status: 409,
  },
  INVALID_PRODUCT_PRICE: {
    message: 'Un producto tiene un precio de venta no válido.',
    status: 409,
  },
};

function requireSupabaseAdmin() {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client not available');
  }
  return supabaseAdmin;
}

function mapCheckoutError(message: string): PosServiceError | null {
  const entry = Object.entries(checkoutErrors).find(([code]) =>
    message.includes(code)
  );
  return entry ? new PosServiceError(entry[1].message, entry[1].status) : null;
}

export const posService = {
  async getAll(
    page = 1,
    limit = 50,
    filters: { search?: string; status?: string } = {}
  ) {
    const supabase = requireSupabaseAdmin();
    const start = (page - 1) * limit;

    let query = supabase
      .from('pos_transacciones')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    const safeSearch = sanitizePostgrestSearch(filters.search ?? '');
    if (safeSearch) {
      query = query.or(
        `numero_transaccion.ilike.%${safeSearch}%,metodo_pago.ilike.%${safeSearch}%`
      );
    }
    if (filters.status) query = query.eq('estado', filters.status);

    const { data, error, count } = await query.range(start, start + limit - 1);

    if (error) throw error;
    return { data: data || [], count: count || 0 };
  },

  async getCatalog(page = 1, limit = 50, search = '') {
    const supabase = requireSupabaseAdmin();
    const start = (page - 1) * limit;
    let query = supabase
      .from('products')
      .select(
        'id, product_code, name, selling_price, inventory!inner(id, quantity_on_hand, quantity_reserved)',
        { count: 'exact' }
      )
      .eq('is_active', true);

    const safeSearch = sanitizePostgrestSearch(search);
    if (safeSearch) {
      query = query.or(
        `name.ilike.%${safeSearch}%,product_code.ilike.%${safeSearch}%`
      );
    }

    const { data, error, count } = await query
      .order('name', { ascending: true })
      .range(start, start + limit - 1);

    if (error) throw error;

    const rows = (data || []) as ProductWithInventoryRow[];
    const products = rows.map((row): POSCatalogProduct => {
      const inventory = Array.isArray(row.inventory)
        ? row.inventory[0]
        : row.inventory;

      if (!inventory) {
        throw new Error(`Product ${row.id} has no inventory record`);
      }
      if (Array.isArray(row.inventory) && row.inventory.length !== 1) {
        throw new Error(`Product ${row.id} has multiple inventory records`);
      }

      const sellingPrice = Number(row.selling_price);
      if (!Number.isFinite(sellingPrice) || sellingPrice < 0) {
        throw new Error(`Product ${row.id} has an invalid selling price`);
      }

      const onHand = inventory.quantity_on_hand ?? 0;
      const reserved = inventory.quantity_reserved ?? 0;

      return {
        inventory_id: inventory.id,
        product_id: row.id,
        product_code: row.product_code,
        name: row.name,
        selling_price: sellingPrice,
        available_quantity: Math.max(0, onHand - reserved),
      };
    });

    return { data: products, count: count || 0 };
  },

  async getOpenRegister(cashierId: string) {
    const supabase = requireSupabaseAdmin();
    const { data, error } = await supabase
      .from('cash_register')
      .select(
        'id, cashier_id, opening_balance, closing_balance, opened_at, closed_at, status'
      )
      .eq('cashier_id', cashierId)
      .eq('status', 'open')
      .maybeSingle();

    if (error) throw error;
    return data as CashRegister | null;
  },

  async openRegister(cashierId: string, openingBalance: number) {
    const supabase = requireSupabaseAdmin();
    const { data, error } = await supabase
      .from('cash_register')
      .insert({
        cashier_id: cashierId,
        opening_balance: openingBalance,
        status: 'open',
      })
      .select(
        'id, cashier_id, opening_balance, closing_balance, opened_at, closed_at, status'
      )
      .single();

    if (error?.code === '23505') {
      throw new PosServiceError('Ya existe una caja abierta para este usuario.', 409);
    }
    if (error) throw error;
    return data as CashRegister;
  },

  async closeRegister(cashierId: string, closingBalance: number) {
    const supabase = requireSupabaseAdmin();
    const { data, error } = await supabase
      .from('cash_register')
      .update({
        closing_balance: closingBalance,
        closed_at: new Date().toISOString(),
        status: 'closed',
      })
      .eq('cashier_id', cashierId)
      .eq('status', 'open')
      .select(
        'id, cashier_id, opening_balance, closing_balance, opened_at, closed_at, status'
      )
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      throw new PosServiceError('No hay una caja abierta para cerrar.', 409);
    }
    return data as CashRegister;
  },

  async createSale(userId: string, input: POSCheckoutInput) {
    const supabase = requireSupabaseAdmin();
    const { data, error } = await supabase.rpc('create_pos_sale', {
      p_user_id: userId,
      p_customer_id: input.customer_id,
      p_payment_method: input.payment_method,
      p_amount_paid: input.amount_paid,
      p_items: input.items,
    });

    if (error) {
      const domainError = mapCheckoutError(error.message);
      if (domainError) throw domainError;
      throw error;
    }
    if (!data) {
      throw new Error('POS checkout returned no transaction');
    }
    return data;
  },
};
