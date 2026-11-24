import type { PostgrestError } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/db/supabase';
import type { PurchaseDetailsInput, PurchaseInput, PurchaseReceiptInput } from '@/lib/purchases';
import { sanitizePostgrestSearch } from '@/lib/utils/search';

const columns = 'id, numero_po:po_number, proveedor_id:supplier_id, fecha_orden:order_date, fecha_entrega_esperada:expected_delivery_date, fecha_recepcion:actual_delivery_date, estado:status, monto_total:total_amount, notes, edit_version, created_at, updated_at, supplier:suppliers(id,name), items:purchase_order_items(id,product_id,quantity_ordered,quantity_received,unit_price,line_total,product:products(id,name,product_code))';

export class PurchaseError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'PurchaseError';
  }
}

function database() {
  if (!supabaseAdmin) throw new Error('Supabase admin client is not configured.');
  return supabaseAdmin;
}

const errors: Record<string, string> = {
  supplier_inactive: 'El proveedor no existe o está inactivo.',
  product_inactive: 'Un producto no existe o está inactivo.',
  duplicate_product: 'Un producto aparece más de una vez.',
  total_overflow: 'El total supera el máximo permitido.',
  purchase_conflict: 'La solicitud se utilizó con otros datos. Revisa las órdenes.',
  invalid_purchase: 'Revisa los datos de la orden y sus productos.',
  order_missing: 'Orden no encontrada.',
  order_not_pending: 'Esta orden ya no admite recepciones. Actualiza la lista.',
  invalid_order_items: 'La orden tiene productos o cantidades inconsistentes y requiere revisión.',
  quantity_exceeded: 'La cantidad supera lo pendiente. Actualiza la lista.',
  receipt_conflict: 'La solicitud se utilizó con otros datos. Revisa la orden.',
  stock_uninitialized: 'Inicializa las existencias del producto antes de recibirlo.',
  invalid_stock: 'Las existencias son inconsistentes y requieren revisión.',
  stock_overflow: 'La recepción supera el máximo de existencias permitido.',
  invalid_receipt: 'Revisa los datos de recepción.',
  order_not_cancellable: 'Solo se pueden anular órdenes pendientes sin recepciones.',
  order_not_editable: 'Solo se pueden editar órdenes pendientes sin recepciones.',
  order_changed: 'La orden cambió. Actualiza la lista e inténtalo nuevamente.',
  invalid_order: 'La orden tiene datos inconsistentes y requiere revisión.',
  invalid_details: 'Revisa la fecha y las notas.',
  invalid_cancellation: 'No se pudo validar la anulación.',
  version_overflow: 'La orden requiere revisión antes de editarse nuevamente.',
};

function handleRpcError(error: PostgrestError): never {
  if (error.code === 'P0001' && errors[error.message]) {
    throw new PurchaseError(errors[error.message], error.message === 'order_missing' ? 404 : 409);
  }
  if (error.code === '23505') {
    throw new PurchaseError('El número de orden o la solicitud ya fue utilizado.', 409);
  }
  throw error;
}

export const comprasService = {
  async getAll(page: number, limit: number, filters: { search?: string; status?: string; supplierId?: string }) {
    const start = (page - 1) * limit;
    let query = database().from('purchase_orders').select(columns, { count: 'exact' });
    const search = sanitizePostgrestSearch(filters.search ?? '');
    if (search) query = query.ilike('po_number', `%${search}%`);
    if (filters.status) query = query.eq('status', filters.status === 'partial' ? 'partially_received' : filters.status);
    if (filters.supplierId) query = query.eq('supplier_id', filters.supplierId);
    const { data, error, count } = await query.order('created_at', { ascending: false })
      .order('id', { ascending: false }).range(start, start + limit - 1);
    if (error) throw error;
    if (!data || count === null) throw new Error('Purchase list returned incomplete data.');
    return { data, count };
  },

  async getById(id: string) {
    const { data, error } = await database().from('purchase_orders').select(columns).eq('id', id).maybeSingle();
    if (error) throw error;
    return data;
  },

  async getTotal() {
    const { data, error } = await database().rpc('get_purchase_total');
    if (error) throw error;
    if (data === null || !Number.isFinite(Number(data))) throw new Error('Purchase total is invalid.');
    return Number(data);
  },

  async options(kind: 'suppliers' | 'products', search: string) {
    const { data, error } = await database().from(kind)
      .select('id,name').eq('is_active', true)
      .ilike('name', `%${sanitizePostgrestSearch(search)}%`)
      .order('name').order('id').limit(25);
    if (error) throw error;
    if (!data) throw new Error('Purchase options returned incomplete data.');
    return data;
  },

  async create(input: PurchaseInput, actor: string) {
    const { data, error } = await database().rpc('create_purchase_order', {
      p_id: input.id, p_number: input.numero_po, p_supplier: input.proveedor_id,
      p_date: input.fecha_orden, p_notes: input.notes, p_items: input.items, p_actor: actor,
    });
    if (error) handleRpcError(error);
    return data;
  },

  async receive(id: string, input: PurchaseReceiptInput, actor: string) {
    const { data, error } = await database().rpc('receive_partial_purchase_order', {
      p_order_id: id, p_receipt_id: input.id, p_date: input.date, p_actor: actor, p_items: input.items,
    });
    if (error) handleRpcError(error);
    return data;
  },

  async cancel(id: string, actor: string) {
    const { data, error } = await database().rpc('cancel_pending_purchase_order', { p_order_id: id, p_actor: actor });
    if (error) handleRpcError(error);
    return data;
  },

  async editDetails(id: string, input: PurchaseDetailsInput, actor: string) {
    const { data, error } = await database().rpc('edit_pending_purchase_details', {
      p_order_id: id, p_actor: actor, p_date: input.fecha_orden,
      p_notes: input.notes, p_version: input.edit_version,
    });
    if (error) handleRpcError(error);
    return data;
  },
};
